
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_EMAIL = 'aki.ruthwik9999@gmail.com'; // Corrected from available users list

async function elevateUser() {
    console.log(`Elevating ${TARGET_EMAIL} to OWNER...`);

    // 1. Find User
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error(`❌ User ${TARGET_EMAIL} NOT FOUND in Auth!`);
        console.log("Available users:", users?.map(u => u.email).join(', '));
        return;
    }
    console.log(`Found User: ${user.id}`);

    // 2. Check Membership
    const { data: member } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (member) {
        console.log(`User is member of Org: ${member.organization_id} with Role: ${member.role}`);
        // Update
        const { error } = await supabase
            .from('organization_members')
            .update({ role: 'owner' })
            .eq('user_id', user.id);

        if (error) console.error("Update failed:", error);
        else {
            console.log("✅ Updated role to OWNER");
            // Sync user_profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ organization_id: member.organization_id })
                .eq('id', user.id);

            if (profileError) console.error("Profile sync failed:", profileError);
            else console.log("✅ Synced user_profile.organization_id");
        }
    } else {
        console.log("User has NO membership. Assigning to an Organization...");
        // Find an Org (e.g., last created, or just the first one)
        const { data: org } = await supabase.from('organizations').select('id, name').limit(1).single();

        if (org) {
            console.log(`Adding to Org: ${org.name} (${org.id})`);
            const { error } = await supabase.from('organization_members').insert({
                organization_id: org.id,
                user_id: user.id,
                role: 'owner'
            });
            if (error) console.error("Insert failed:", error);
            else {
                console.log("✅ Inserted as OWNER");
                // Sync user_profile
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({ organization_id: org.id })
                    .eq('id', user.id);

                if (profileError) console.error("Profile sync failed:", profileError);
                else console.log("✅ Synced user_profile.organization_id");
            }
        } else {
            console.error("No organizations found to join!");
        }
    }
}

elevateUser();
