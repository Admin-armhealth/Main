
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRoles() {
    console.log("Fetching all Organization Memberships...");

    // Query basic members table
    const { data: members, error } = await supabase
        .from('organization_members')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Also get all auth users to match emails
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    // Get Orgs to map names
    const { data: orgs } = await supabase.from('organizations').select('id, name');

    members?.forEach(m => {
        const authUser = users?.find(u => u.id === m.user_id);
        const org = orgs?.find(o => o.id === m.organization_id);
        console.log(`Email: ${authUser?.email} | Role: ${m.role} | Org: ${org?.name}`);
    });
}

checkRoles();
