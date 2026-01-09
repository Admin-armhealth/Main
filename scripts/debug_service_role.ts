
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
    console.log("🔍 Testing Service Role Key...");
    console.log("Key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

    const { data, error } = await supabase
        .from('policies')
        .select(`
            title, 
            cpt_code, 
            policy_sections(content)
        `)
        .eq('cpt_code', 'CPB-0001')
        .single();

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log("✅ Policy Found via Service Role:");
        console.log("Title:", data.title);
        console.log("Sections:", data.policy_sections?.length);
    }
}

check();
