
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function scrapeContent(page: any, url: string): Promise<string | null> {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Heuristic: specific content area or Body
        const content = await page.locator('.bodytext, .cyphen_body, main, body').first().innerText();
        return content || null;
    } catch (e) {
        console.error(`   ⚠️ Failed to fetch ${url}`, e);
        return null;
    }
}

async function runMonitor() {
    console.log("🕵️ Starting Policy Change Monitor...");

    // 1. Get Active Policies
    // Note: We only check a subset to avoid being banned/slow, or use a "last_checked" column in real world
    const { data: policies, error } = await supabase
        .from('policies')
        .select('id, title, source_url, content_hash, version')
        .eq('status', 'active')
        .limit(20); // Check 20 for MVP

    if (error || !policies) {
        console.error("   ❌ Failed to fetch policies:", error);
        return;
    }

    console.log(`   Checking ${policies.length} policies for updates...`);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    let changesDetected = 0;

    for (const policy of policies) {
        if (!policy.source_url) continue;

        console.log(`\n   🔎 Checking: ${policy.title?.substring(0, 30)}...`);
        const currentContent = await scrapeContent(page, policy.source_url);

        if (!currentContent) continue;

        const newHash = getHash(currentContent);

        // If no hash stored yet, just save it (First Run)
        if (!policy.content_hash) {
            console.log("      🆕 First run for this policy. Saving baseline hash.");
            await supabase.from('policies').update({ content_hash: newHash }).eq('id', policy.id);
            continue;
        }

        if (newHash !== policy.content_hash) {
            console.log("      🚨 CHANGE DETECTED!");
            changesDetected++;

            // 1. Record Change
            await supabase.from('policy_changes').insert({
                policy_id: policy.id,
                old_hash: policy.content_hash,
                new_hash: newHash,
                change_summary: 'Content changed on payer website.', // Placeholder for AI Summary
                detected_at: new Date().toISOString()
            });

            // 2. Update Policy
            await supabase.from('policies').update({
                content_hash: newHash,
                version: (policy.version || 1) + 1,
                updated_at: new Date().toISOString()
            }).eq('id', policy.id);

            // 3. (Mock) Send Notification
            console.log("      📧 [EMAIL SENT] To: clinicians@armhealth.io - Subject: Policy Update Alert");
        } else {
            console.log("      ✅ No changes.");
        }
    }

    await browser.close();
    console.log(`\n🏁 Monitor Verification Complete. ${changesDetected} changes found.`);
}

runMonitor();
