
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
    console.log("🔍 Verifying Policy Engine Data...");

    const { count: policyCount, error: pErr } = await supabase
        .from('policies')
        .select('*', { count: 'exact', head: true });

    if (pErr) console.error("Error counting policies:", pErr.message);
    else console.log(`✅ Policies: ${policyCount}`);

    const { count: sectionCount, error: sErr } = await supabase
        .from('policy_sections')
        .select('*', { count: 'exact', head: true });

    if (sErr) console.error("Error counting sections:", sErr.message);
    else console.log(`✅ Policy Sections: ${sectionCount}`);

    const { count: codeCount, error: cErr } = await supabase
        .from('policy_codes')
        .select('*', { count: 'exact', head: true });

    if (cErr) console.error("Error counting codes:", cErr.message);
    else console.log(`✅ Policy Codes: ${codeCount}`);

    // Show all sections to debug
    const { data: allSections } = await supabase
        .from('policy_sections')
        .select('policy_id, section_title, content');

    console.log("\nAll Sections IDs:", allSections?.map(s => ({
        pid: s.policy_id,
        title: s.section_title,
        len: s.content?.length
    })));

    // Show detailed sample

    const { data: sample } = await supabase
        .from('policies')
        .select('title, last_scraped_at, policy_sections(section_title)')
        .limit(1);

    if (sample && sample.length > 0) {
        console.log("\nSample Policy:", JSON.stringify(sample[0], null, 2));
    } else {
        console.log("\n⚠️ No policies found.");
    }
}

verify();
