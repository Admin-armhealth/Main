import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateText } from '@/lib/aiClient';

function cleanHtml(html: string): string {
    return html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export async function POST(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { },
                remove(name: string, options: CookieOptions) { },
            },
        }
    );

    try {
        // 1. Fetch all policies with a URL
        // OPTIMIZATION: Only fetch 5 records at a time to prevent memory overflow
        const { data: policies, error } = await supabase
            .from('policies')
            .select(`id, title, source_url, content_hash`)
            .not('source_url', 'is', null)
            .range(0, 4);

        if (error) throw error;
        if (!policies || policies.length === 0) {
            return NextResponse.json({ message: 'No policies with URLs to sync.', synced: 0 });
        }

        const updates = [];
        const errors = [];
        let unchanged = 0;

        // 2. Process each policy (In a real queue, this would be a specialized job)
        // We already limited the fetch to 5
        const batch = policies;

        for (const policy of batch) {
            try {
                // A. Fetch current web content
                const res = await fetch(policy.source_url);
                if (!res.ok) {
                    errors.push({ id: policy.id, error: `HTTP ${res.status}` });
                    continue;
                }
                const rawHtml = await res.text();
                const cleanText = cleanHtml(rawHtml);

                // B. Hash it
                const newHash = crypto.createHash('sha256').update(cleanText).digest('hex');

                // C. Compare (If new hash != old hash, re-extract)
                if (newHash !== policy.content_hash) {
                    console.log(`Analyzing update for policy: ${policy.title}`);

                    // RE-EXTRACT LOGIC (Same as /import)
                    const systemPrompt = `You are a Clinical Policy Analyst. Update the rules based on new text. Return JSON only.`;
                    const userPrompt = `
Analyze the updated policy text and extract medical necessity criteria.
Text:
"""
${cleanText.substring(0, 15000)}
"""

JSON Structure:
{
  "policy_content": "string (bulleted list of new rules)"
}`;

                    const jsonStr = await generateText({
                        systemPrompt,
                        userPrompt,
                        temperature: 0,
                        jsonMode: true
                    });

                    const extracted = JSON.parse(jsonStr.replace(/```json\n?|```/g, '').trim());

                    // D. Update Database
                    const { error: updateErr } = await supabase
                        .from('policies')
                        .update({
                            policy_content: extracted.policy_content,
                            content_hash: newHash,
                            last_checked_at: new Date().toISOString(),
                            last_updated_at: new Date().toISOString()
                        })
                        .eq('id', policy.id);

                    if (updateErr) throw updateErr;
                    updates.push(policy.title);

                } else {
                    // Just update 'last_checked_at'
                    await supabase
                        .from('policies')
                        .update({ last_checked_at: new Date().toISOString() })
                        .eq('id', policy.id);
                    unchanged++;
                }

            } catch (err: any) {
                console.error(`Error syncing policy ${policy.id}:`, err);
                errors.push({ id: policy.id, title: policy.title, msg: err.message });
            }
        }

        return NextResponse.json({
            message: 'Sync complete',
            stats: {
                processed: batch.length,
                updated: updates,
                unchanged,
                errors
            }
        });

    } catch (e: any) {
        console.error('Sync Job Failed:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
