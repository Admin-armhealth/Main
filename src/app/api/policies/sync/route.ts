import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Fetch policies that need updating (Oldest checked first)
        const { data: policies, error } = await supabase
            .from('policies')
            .select(`id, title, source_url, content_hash`)
            .not('source_url', 'is', null)
            .order('last_checked_at', { ascending: true, nullsFirst: true })
            .limit(3); // Process 3 at a time (Limit due to Browser overhead)

        if (error) throw error;
        if (!policies || policies.length === 0) {
            return NextResponse.json({ message: 'No policies to sync.' });
        }

        // Dynamic Imports
        const { generateText } = await import('@/lib/aiClient');
        const puppeteer = (await import('puppeteer')).default;
        const crypto = (await import('crypto')).default;

        console.log(`🔄 Syncing ${policies.length} policies...`);

        // Launch Browser ONCE
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const results = [];

        try {
            for (const policy of policies) {
                console.log(`   Processing: ${policy.title} (${policy.source_url})`);
                const page = await browser.newPage();

                try {
                    // A. Robust Fetching
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    await page.goto(policy.source_url, { waitUntil: 'networkidle2', timeout: 30000 });

                    const textContent = await page.evaluate(() => document.body.innerText.substring(0, 25000));
                    const cleanText = textContent.replace(/\s+/g, ' ').trim();

                    // B. Change Detection
                    const newHash = crypto.createHash('sha256').update(cleanText).digest('hex');

                    if (newHash !== policy.content_hash) {
                        console.log(`      ⚡ Content Changed! Triggering AI...`);

                        // C. AI Extraction (The Brain)
                        const systemPrompt = `You are a Clinical Policy Analyst. Extract the "Medical Necessity Criteria" and "Exclusions" from this policy text into structured JSON.`;
                        const userPrompt = `
                        POLICY: ${policy.title}
                        TEXT: ${cleanText.substring(0, 15000)}... (truncated)

                        OUTPUT JSON:
                        {
                            "effective_date": "string",
                            "criteria": [{ "section": "string", "rules": ["string"] }],
                            "exclusions": ["string"]
                        }`;

                        const jsonStr = await generateText({
                            systemPrompt,
                            userPrompt,
                            temperature: 0,
                            jsonMode: true
                        });

                        const structured = JSON.parse(jsonStr.replace(/```json\\n?|```/g, '').trim());

                        // D. Update DB
                        await supabase
                            .from('policies')
                            .update({
                                structured_content: structured,
                                policy_content: cleanText.substring(0, 5000), // Human readable fallback
                                content_hash: newHash,
                                last_checked_at: new Date().toISOString(),
                                last_updated_at: new Date().toISOString()
                            })
                            .eq('id', policy.id);

                        results.push({ id: policy.id, status: 'updated' });
                    } else {
                        console.log(`      💤 No changes.`);
                        await supabase.from('policies').update({ last_checked_at: new Date().toISOString() }).eq('id', policy.id);
                        results.push({ id: policy.id, status: 'unchanged' });
                    }

                } catch (err: any) {
                    console.error(`      ❌ Failed to process ${policy.id}:`, err.message);
                    results.push({ id: policy.id, status: 'error', error: err.message });
                } finally {
                    await page.close();
                }
            }
        } finally {
            await browser.close();
        }

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        console.error("Sync Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
