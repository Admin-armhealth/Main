
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log("🕵️ Checking for 'exec_sql' RPC...");
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'select 1 as ok' });

    if (error) {
        console.error("❌ RPC Check Failed:", error.message);
    } else {
        console.log("✅ RPC Available! Result:", data);
    }
}

check();
