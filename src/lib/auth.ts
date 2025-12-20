import { createClient } from '@supabase/supabase-js';

const ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'member': 2,
    'readonly': 1
};

type Role = keyof typeof ROLE_HIERARCHY;

export interface OrgMetadata {
    role: Role;
    organization_id: string;
    user_id: string;
}

/**
 * Validates that a user belongs to an organization and has sufficient privileges.
 * Uses Service Role to bypass RLS for the check.
 */
export async function validateOrgAccess(
    userId: string,
    orgId: string,
    requiredRole: Role = 'member'
): Promise<OrgMetadata> {

    if (!userId || !orgId) {
        throw new Error("Missing Identity Headers");
    }

    // Initialize Service Client for Admin-level checks
    // We create it here to ensure this function is always authoritative
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: member, error } = await serviceClient
        .from('organization_members')
        .select('role, organization_id, user_id')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .maybeSingle();

    if (error) {
        console.error(`Auth DB Error: ${error.message}`);
        throw new Error("Authorization Check Failed");
    }

    if (!member) {
        // 403 / Not a member
        throw new Error("Unauthorized: Not a member of this organization");
    }

    // Role Hierarchy Check
    const userRoleValue = ROLE_HIERARCHY[member.role as Role] || 0;
    const requiredValue = ROLE_HIERARCHY[requiredRole] || 0;

    if (userRoleValue < requiredValue) {
        throw new Error(`Insufficient Permissions: Required ${requiredRole}, have ${member.role}`);
    }

    return member as OrgMetadata;
}
