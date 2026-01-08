
// scripts/generate_aetna_dental_seed.ts
import fs from 'fs';

const OUTPUT_FILE = './supabase/seed_aetna_dental.sql';

function generate() {
    console.log("🚀 Generating Aetna DENTAL Database (DCPB 001 - 099)...");

    let sql = `-- AUTO-GENERATED: AETNA DENTAL POLICIES\n`;
    sql += `insert into policies (payer, cpt_code, title, source_url)\nvalues\n`;

    const values = [];

    // Valid DCPB numbers provided by user verification
    const validDcpbs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49];

    for (const num of validDcpbs) {
        const cpbNum = num.toString().padStart(3, '0'); // 001, 012, 049

        // URL Format Verified by Browser: 
        // https://www.aetna.com/health-care-professionals/clinical-policy-bulletins/dental-clinical-policy-bulletins/DCPB012.html
        const url = `https://www.aetna.com/health-care-professionals/clinical-policy-bulletins/dental-clinical-policy-bulletins/DCPB${cpbNum}.html`;

        values.push(`('Aetna Dental', 'DCPB-${cpbNum}', 'Aetna Dental Policy ${cpbNum}', '${url}')`);
    }

    sql += values.join(',\n');
    sql += `\non conflict (payer, cpt_code, organization_id) do update set source_url = excluded.source_url;\n`;

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`✅ Generated ${values.length} dental policy records.`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

generate();
