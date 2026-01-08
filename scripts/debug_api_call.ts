
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Use ANON key to simulate real user (RLS applies)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function simulateApi() {
    console.log("🕵️ Simulating API Call (Client-Side)...");

    // Exact query from route.ts
    const { data: policies, error } = await supabase
        .from('policies')
        .select(`
            id,
            title,
            payer,
            updated_at,
            status,
            organization_id
        `)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("❌ API Query Error:", error);
    } else {
        console.log(`✅ API Query Success. Found ${policies?.length} items.`);
        if (policies?.length === 0) {
            console.log("   (Empty result suggests RLS is blocking rows)");
        } else {
            console.log("   Sample:", policies?.[0]);
        }
    }
}

simulateApi();
