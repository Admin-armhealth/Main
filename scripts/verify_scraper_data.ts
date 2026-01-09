
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

async function verifyData() {
    console.log("🔍 Verifying Scraper Output...");

    // 1. Get the most recently updated policy
    const { data: policies, error: policyError } = await supabase
        .from('policies')
        .select('*')
        .order('last_scraped_at', { ascending: false })
        .limit(1);

    if (policyError) {
        console.error("❌ Error fetching policies:", policyError);
        return;
    }

    if (!policies || policies.length === 0) {
        console.log("⚠️ No policies found.");
        return;
    }

    const policy = policies[0];
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    log(`\n📄 Latest Policy: [${policy.cpt_code}] ${policy.title}`);
    log(`   Source: ${policy.source_url}`);
    log(`   Last Scraped: ${policy.last_scraped_at}`);
    log(`   Status: ${policy.status}`);
    log(`   ID: ${policy.id}`);

    // 2. Get associated sections
    const { data: sections, error: sectionError } = await supabase
        .from('policy_sections')
        .select('section_title, display_order, content')
        .eq('policy_id', policy.id)
        .order('display_order');

    if (sectionError) console.error("❌ Error fetching sections:", sectionError);
    log(`\n📚 Sections (${sections?.length || 0}):`);
    sections?.forEach(s => {
        log(`   - ${s.section_title} (Order ${s.display_order}, Size: ${s.content?.length} chars)`);
    });

    // 3. Get associated rules
    const { data: rules, error: rulesError } = await supabase
        .from('policy_rules')
        .select('*')
        .eq('policy_id', policy.id);

    if (rulesError) console.error("❌ Error fetching rules:", rulesError);

    log(`\n⚖️ Rules (${rules?.length || 0}):`);
    if (rules && rules.length > 0) {
        rules.forEach((r, i) => {
            log(`   Rule ${i + 1} [${r.category}]: ${r.operator}`);
            let val = JSON.stringify(r.value_json);
            if (val.length > 100) val = val.substring(0, 100) + "... (truncated)";
            log(`     Value: ${val}`);
            log(`     Fail Msg: ${r.failure_message}`);
        });
    } else {
        log("   ⚠️ No rules found for this policy.");
    }

    const fs = await import('fs');
    fs.writeFileSync('verification_output.txt', output);
    console.log("✅ Output written to verification_output.txt");
}

verifyData();
