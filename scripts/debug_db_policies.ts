
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use ANON key to test RLS
);

async function check() {
    console.log("🔍 Checking 'policies' table count...");
    const { count, error } = await supabase.from('policies').select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log(`✅ Total Policies in DB: ${count}`);
    }

    // Check one item with organization_id and source_url
    const { data } = await supabase.from('policies').select('title, organization_id, source_url').limit(5);
    console.log("Sample Data:", data);
}

check();
