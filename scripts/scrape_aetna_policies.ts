
// scripts/scrape_aetna_policies.ts
// PURPOSE: Scrape Aetna CPBs and IMMEDIATELY structure them into deterministic rules.

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Helper to ensure env vars loaded before dynamic import might be used? 
// No, dynamic import handles its own scope but env vars must be process.env accessible.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const CPB_BASE_URL = 'https://www.aetna.com/cpb/medical/data';

function getRangeFolder(cpbNumber: number): string {
    if (cpbNumber < 100) return '1_99';
    const start = Math.floor(cpbNumber / 100) * 100;
    const end = start + 99;
    return `${start}_${end}`;
}

function buildCpbUrl(cpbNumber: number): string {
    const folder = getRangeFolder(cpbNumber);
    const paddedNum = cpbNumber.toString().padStart(4, '0');
    return `https://www.aetna.com/cpb/medical/data/${folder}/${paddedNum}.html`;
}

async function scrapePolicy(page: any, cpbNumber: number) {
    const paddedNum = cpbNumber.toString().padStart(4, '0');
    const url = buildCpbUrl(cpbNumber);
    console.log(`\n🔍 Scraping CPB ${cpbNumber} (${url})...`);

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (response?.status() === 404) {
            console.log(`⚠️ CPB ${cpbNumber} not found.`);
            return;
        }

        const bodyTextRaw = await page.locator('body').innerText().catch(() => '');
        if (/internal error|page not found/i.test(bodyTextRaw)) return;

        // 1. Extract Metadata
        const title = await page.locator('h1').first().textContent();
        console.log(`   📄 Title: ${title?.trim()}`);

        const { fullHtml, cleanText } = await page.evaluate(() => {
            const body = document.body;
            // Remove scripts/styles for cleaner text
            const clone = body.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('script, style, nav, footer').forEach(el => el.remove());

            return {
                fullHtml: body.innerHTML,
                cleanText: clone.innerText.substring(0, 15000) // Token limit (reduced to avoid timeouts)
            };
        });


        // 2. INLINE AI EXTRACTION (With Retry)
        console.log("   🧠 Extracting Rules (Inline)...");
        const { generateText } = await import('../src/lib/aiClient');

        const systemPrompt = "You are a Medical Policy Structural Analyst. Extract deterministic logic rules.";
        const userPrompt = `
        TASK: Convert this Policy text into JSON Rules.
        
        OUTPUT FORMAT:
        {
           "rules": [
              {
                "category": "String (Conservative Therapy, Imaging, Diagnosis, etc)",
                "operator": "MATCH_ONE" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "EXISTS" | "NOT_EXISTS",
                "value_json": "The value to check (Number, String, Array)",
                "failure_message": "User-friendly error if rule fails"
              }
           ]
        }
        
        POLICY TEXT:
        """${cleanText}"""
        `;

        let rules: any[] = [];
        let attempts = 0;
        const MAX_RETRIES = 3;

        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                if (attempts > 1) console.log(`      Link failure or bad JSON. Retrying (Attempt ${attempts}/${MAX_RETRIES})...`);

                const jsonStr = await generateText({
                    systemPrompt,
                    userPrompt,
                    temperature: 0,
                    jsonMode: true
                });

                const parsed = JSON.parse(jsonStr);
                const candidateRules = parsed.rules || parsed;

                // Basic Validation
                if (Array.isArray(candidateRules) && candidateRules.length > 0) {
                    // Check fields
                    const sample = candidateRules[0];
                    if (sample.category && sample.operator) {
                        rules = candidateRules;
                        break; // Success
                    }
                }

                throw new Error("Invalid Rule Structure returned");

            } catch (aiErr: any) {
                console.error(`      ❌ Extraction attempt ${attempts} failed:`, aiErr.message);
                if (attempts === MAX_RETRIES) {
                    console.error("      ⚠️ Giving up on rules for this policy after max retries.");
                } else {
                    // Wait a bit before retry
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        console.log(`   ✅ Extracted ${rules.length} valid rules.`);

        // 3. STORAGE (Upsert Policy + Rules)

        // A. Upsert Policy
        const { data: policy, error: policyError } = await supabase
            .from('policies')
            .upsert({
                payer: 'Aetna',
                cpt_code: `CPB-${paddedNum}`,
                title: title?.trim(),
                source_url: url,
                last_scraped_at: new Date().toISOString(),
                status: 'active'
            }, { onConflict: 'payer, cpt_code, organization_id' })
            .select()
            .single();

        if (policyError) {
            console.error(`   ❌ Error saving policy: ${policyError.message}`);
            return;
        }

        // B. Save Sections (Legacy/Audit reference)
        await supabase.from('policy_sections').delete().eq('policy_id', policy.id);
        await supabase.from('policy_sections').insert({
            policy_id: policy.id,
            section_title: 'Full Content',
            content: fullHtml,
            display_order: 1
        });

        // C. Save Rules
        if (rules.length > 0) {
            await supabase.from('policy_rules').delete().eq('policy_id', policy.id);
            const inserts = rules.map(r => ({
                policy_id: policy.id,
                category: r.category,
                operator: r.operator,
                value_json: r.value_json,
                failure_message: r.failure_message,
                rule_id: `RULE-${Math.floor(Math.random() * 10000)}`
            }));
            await supabase.from('policy_rules').insert(inserts);
            console.log("   💾 Saved Rules to DB.");
        }

    } catch (e: any) {
        console.error(`   ❌ Fail: ${e.message}`);
    }
}


async function run() {
    // Parse range from command line args (default 1-10)
    const args = process.argv.slice(2);
    const startCpb = args[0] ? parseInt(args[0]) : 1;
    const endCpb = args[1] ? parseInt(args[1]) : 10;

    console.log(`🚀 Starting INLINE Aetna Scraper (Policies ${startCpb}-${endCpb})...`);
    // Headless FALSE so user can solve CAPTCHAs
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();

    const page = await context.newPage();

    for (let cpb = startCpb; cpb <= endCpb; cpb++) {
        await scrapePolicy(page, cpb);
    }

    await browser.close();
    console.log("🏁 Done.");
}

run();
