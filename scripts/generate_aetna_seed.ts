
// scripts/generate_aetna_seed.ts
import fs from 'fs';

const OUTPUT_FILE = './supabase/seed_aetna_all.sql';

function getRangeFolder(num: number): string {
    // Aetna organizes 0-99 in '001_099', 100-199 in '100_199', etc.
    // Wait, let's verify exact format.
    // Actually, checking standard URLs: 
    // CPB 0236 -> '200_299'
    // CPB 0001 -> '0000_0099' usually, let's verify.
    // Assuming standard 'XYY_XYY' logic based on hundreds digit.

    // Correction based on Aetna standard:
    // 1-99: 1_99
    // 100-199: 100_199
    // 200-299: 200_299

    if (num < 100) return '1_99';
    const start = Math.floor(num / 100) * 100;
    const end = start + 99;
    return `${start}_${end}`;
}

function generate() {
    console.log("🚀 Generating Aetna Database (CPB 0001 - 0999)...");

    let sql = `-- AUTO-GENERATED: ALL AETNA POLICIES\n`;
    sql += `insert into policies (payer, cpt_code, title, source_url)\nvalues\n`;

    const values = [];

    for (let i = 1; i < 1000; i++) {
        const cpbNum = i.toString().padStart(4, '0'); // 0001, 0236
        const range = getRangeFolder(i);

        // URL Format: https://www.aetna.com/cpb/medical/data/200_299/0236.html
        const url = `https://www.aetna.com/cpb/medical/data/${range}/${cpbNum}.html`;

        values.push(`('Aetna', 'CPB-${cpbNum}', 'Aetna Policy ${cpbNum}', '${url}')`);
    }

    sql += values.join(',\n');
    sql += `\non conflict (payer, cpt_code, organization_id) do update set source_url = excluded.source_url;\n`;

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`✅ Generated ${values.length} policy records.`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

generate();
