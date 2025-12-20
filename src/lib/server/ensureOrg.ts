import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Ensures user has an organization. 
 * - If no membership → Creates "My Clinic" and assigns as owner
 * - If existing membership → Returns first org
 * - Sets org_id cookie automatically
 */
export async function ensureUserOrg(userId: string): Promise<string> {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already has org membership
    const { data: memberships } = await serviceClient
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId);

    let orgId: string;

    if (memberships && memberships.length > 0) {
        // User already has org(s) - use first one
        orgId = memberships[0].organization_id;
        console.log(`✅ Existing org found for user ${userId}: ${orgId}`);
    } else {
        // New user - create org and assign as owner
        const { data: newOrg, error: orgError } = await serviceClient
            .from('organizations')
            .insert({ name: 'My Clinic' })
            .select()
            .single();

        if (orgError || !newOrg) {
            throw new Error('Failed to create organization');
        }

        // Add user as owner
        // 3. Add User as ADMIN
        const { error: memberError } = await serviceClient
            .from('organization_members')
            .insert({
                organization_id: newOrg.id,
                user_id: userId,
                role: 'admin'
            });

        if (memberError) {
            throw new Error('Failed to add user to organization');
        }

        orgId = newOrg.id;
        console.log(`✅ Auto-created org for new user ${userId}: ${orgId}`);
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('org_id', orgId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return orgId;
}
