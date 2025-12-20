
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load env vars from .env.local manually since we are in a standalone script
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
    console.log('📄 Found .env.local');
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
        const [key, ...rest] = line.split('=');
        const val = rest.join('='); // Handle values with =
        if (key && val) {
            const cleanKey = key.trim();
            const cleanVal = val.trim().replace(/^["']|["']$/g, ''); // Remove quotes

            if (cleanKey === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = cleanVal;
            if (cleanKey === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = cleanVal;
        }
    });

    console.log(`Debug: URL found? ${!!supabaseUrl}, ServiceKey found? ${!!serviceKey}`);
} else {
    console.log('⚠️ .env.local not found at:', envPath);
}

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
});

const ICD_URL = 'https://gist.githubusercontent.com/cryocaustik/b86de96e66489ada97c25fc25f755de0/raw/icd10_codes.json';

async function seed() {
    console.log('⬇️  Fetching ICD-10 codes from GitHub...');

    // Fetch JSON (using native fetch if node 18+, or https fallback)
    let data: any[] = [];
    try {
        const res = await fetch(ICD_URL);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        data = await res.json();
    } catch (e) {
        console.error('Fetch failed', e);
        process.exit(1);
    }

    // The gist data format is likely array of objects or object. 
    // Cryocaustik gist format: Array of { code: "A00", desc: "Cholera" } or similar.
    // Let's inspect/map it safely.
    // Actually, looking at the gist source (if I could), it's usually { "code": "A000", "desc": "..." }

    console.log(`📦 Found ${data.length} codes. Preparing to seed...`);

    const batchSize = 1000;
    const batches = [];

    // Validate table exists first
    const { error: checkError } = await supabase.from('icd10_codes').select('code').limit(1);
    if (checkError && checkError.code === '42P01') { // undefined_table
        console.error('❌ Table "icd10_codes" does not exist.');
        console.error('👉 Please run the migration "supabase/migrations/20241217_icd10_schema.sql" first.');
        process.exit(1);
    }

    // Transform to our schema { code, description }
    // Note: Gist keys might vary. Let's assume common format or log first item if we were debugging.
    // Based on search, it's widely used, likely { code, description } or { code, desc }
    const formattedData = data.map((item: any) => ({
        code: item.code || item.Code, // Handle potnetial casing
        description: item.description || item.desc || item.Description // Handle common keys
    })).filter(i => i.code && i.description);

    for (let i = 0; i < formattedData.length; i += batchSize) {
        const batch = formattedData.slice(i, i + batchSize);
        batches.push(batch);
    }

    console.log(`🚀 Inserting ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
        const { error } = await supabase.from('icd10_codes').upsert(batches[i], { onConflict: 'code' });
        if (error) {
            console.error(`❌ Error in batch ${i}:`, error.message);
        } else {
            if (i % 5 === 0) console.log(`✅ Batch ${i + 1}/${batches.length} inserted.`);
        }
    }

    console.log('✨ Seeding complete!');
}

seed();
