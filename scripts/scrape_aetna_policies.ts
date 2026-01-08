
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CPB_BASE_URL = 'https://www.aetna.com/cpb/medical/data';

// Helper to determine range folder (e.g., 1_99, 100_199)
function getRangeFolder(cpbNumber: number): string {
    if (cpbNumber < 100) return '1_99';
    if (cpbNumber < 200) return '100_199';
    if (cpbNumber < 300) return '200_299';
    if (cpbNumber < 400) return '300_399';
    if (cpbNumber < 500) return '400_499';
    if (cpbNumber < 600) return '500_599';
    if (cpbNumber < 700) return '600_699';
    if (cpbNumber < 800) return '700_799';
    if (cpbNumber < 900) return '800_899';
    return '900_999';
}

async function scrapePolicy(page: any, cpbNumber: number) {
    const paddedNum = cpbNumber.toString().padStart(4, '0'); // 0001
    const range = getRangeFolder(cpbNumber);
    const url = `${CPB_BASE_URL}/${range}/${paddedNum}.html`;

    console.log(`\n🔍 Scraping CPB ${paddedNum} (${url})...`);

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (response.status() === 404) {
            console.log(`⚠️ CPB ${paddedNum} not found.`);
            return;
        }

        // 1. Extract Metadata
        const title = await page.locator('h1').first().textContent();
        const lastReviewDate = await page.locator('text=Last Review').first().textContent().catch(() => null);

        console.log(`   📄 Title: ${title?.trim()}`);

        // 2. Upsert Policy Record
        const { data: policy, error: policyError } = await supabase
            .from('policies')
            .upsert({
                payer: 'Aetna',
                cpt_code: `CPB-${paddedNum}`, // Using CPB as the primary "code" for now
                title: title?.trim(),
                source_url: url,
                last_scraped_at: new Date().toISOString(),
                status: 'active'
            }, { onConflict: 'payer, cpt_code, organization_id' }) // Note: organization_id is null for global
            .select()
            .single();

        if (policyError) {
            console.error(`   ❌ Error upserting policy: ${policyError.message}`);
            return;
        }

        const policyId = policy.id;

        // 3. Extract Sections
        // Aetna policies usually have headers like "Policy", "Background", "Coding"
        // This is a heuristic; structure varies.
        const sections: any[] = [];

        // Strategy: Iterate over H3/H2 headers and get following content until next header
        const headers = await page.locator('div.bodytext h3, div.bodytext h2').all();

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const sectionTitle = await header.textContent();

            // Get content: deeply implementation specific, simplifying for MVP
            // capturing the 'next sibling' logic in Playwright is tricky without evaluation
            // We'll simplisticly grab the text content of the next sibling div/p if possible or just dump the whole body?
            // Better: Get the full HTML of the '.bodytext' and parse manually? 
            // For now, let's just grab the whole bodytext and store it as one big section if we can't split easily,
            // OR simpler: specific targeted headers.

            // Let's try to extract "Policy" section specifically.
        }

        // 3. Extract Sections (The "Rules")
        // Try multiple selectors for the main content area
        const contentSelectors = ['.cyphen_body', '#cyphen_body', 'div.bodytext', 'main', 'body'];
        let fullHtml = null;

        for (const selector of contentSelectors) {
            const locator = page.locator(selector).first();
            if (await locator.count() > 0) {
                console.log(`   found content using selector: ${selector}`);
                fullHtml = await locator.innerHTML();
                break;
            }
        }

        if (fullHtml) {
            // Simple robust storage: Store the whole thing as "Full Content" for now
            await supabase.from('policy_sections').delete().eq('policy_id', policyId);

            // Clean up the HTML slightly if needed (optional)

            await supabase.from('policy_sections').insert({
                policy_id: policyId,
                section_title: 'Full Policy Text', // Changed to indicate it contains the rules
                content: fullHtml,
                display_order: 1
            });
            console.log(`   ✅ Saved full policy text (${fullHtml.length} chars).`);
        } else {
            console.warn(`   ⚠️ Could not find content container for ${url}`);
        }

        // 4. Extract CPT Codes
        // Look for tables containing CPT codes
        const cptMatches = await page.evaluate(() => {
            const codes: any[] = [];
            const text = document.body.innerText;
            // Regex for CPT codes (5 digits)
            const regex = /\b\d{5}\b/g;
            const found = text.match(regex);
            if (found) {
                return [...new Set(found)]; // Unique
            }
            return [];
        });

        if (cptMatches.length > 0) {
            console.log(`   🔢 Found ${cptMatches.length} potential CPT codes.`);
            const codeInserts = cptMatches.map((code: string) => ({
                policy_id: policyId,
                code: code,
                code_type: 'CPT'
            }));

            // Batch insert, ignoring duplicates
            const { error: codeError } = await supabase
                .from('policy_codes')
                .upsert(codeInserts, { onConflict: 'policy_id, code, code_type' });

            if (codeError) console.error(`   ⚠️ Error saving codes: ${codeError.message}`);
        }

    } catch (e) {
        console.error(`   ❌ Failed to scrape ${url}:`, e);
    }
}

async function run() {
    console.log("🚀 Starting Aetna Policy Scraper (Full Catalog 1-1000)...");

    const browser = await chromium.launch();

    // Add randomness to prevent bot detection
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });

    // Concurrency Limit
    const CONCURRENCY = 5;
    const LIMIT = 1000;

    const queue = Array.from({ length: LIMIT }, (_, i) => i + 1);
    const activeWorkers: Promise<void>[] = [];

    async function worker() {
        const page = await context.newPage();
        while (queue.length > 0) {
            const cpb = queue.shift();
            if (cpb) {
                await scrapePolicy(page, cpb);
            }
        }
        await page.close();
    }

    // Start workers
    for (let i = 0; i < CONCURRENCY; i++) {
        activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);

    await browser.close();
    console.log("\n🏁 Scraping complete.");
}

run();
