
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use service role to ensure we can delete everything
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearPolicies() {
    console.log("🗑️ Clearing ALL Policies...");

    // Delete all policies - CASCADE should handle sections and rules
    const { error } = await supabase
        .from('policies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete not equal to nil uuid (effectively all)

    if (error) {
        console.error("❌ Failed to clear policies:", error.message);
    } else {
        console.log("✅ Policies Cleared.");
    }
}

clearPolicies();
