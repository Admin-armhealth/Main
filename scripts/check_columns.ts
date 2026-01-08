
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log("🔍 Checking 'policies' columns...");

    // 1. Check payer vs payer_id
    const { error: e1 } = await supabase.from('policies').select('payer_id').limit(1);
    if (e1) console.log("❌ 'payer_id' does NOT exist.");
    else console.log("✅ 'payer_id' exists.");

    const { error: e2 } = await supabase.from('policies').select('payer').limit(1);
    if (e2) console.log("❌ 'payer' does NOT exist.");
    else console.log("✅ 'payer' exists.");

    // 2. Check updated_at
    const { error: e3 } = await supabase.from('policies').select('updated_at').limit(1);
    if (e3) console.log("❌ 'updated_at' does NOT exist.");
    else console.log("✅ 'updated_at' exists.");
}

check();
