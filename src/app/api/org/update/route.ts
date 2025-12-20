import { NextRequest, NextResponse } from 'next/server';
import { validateOrgAccess } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(req: NextRequest) {
    try {
        const { name, npi, tin } = await req.json();

        const userId = req.headers.get('x-user-id');
        const orgId = req.headers.get('x-organization-id');

        if (!userId) {
            return NextResponse.json({ error: 'Missing user auth header' }, { status: 401 });
        }

        // 1. Try to validate with the cached/header ID if present
        let targetOrgId: string | null = orgId;
        let validMember = null;

        if (targetOrgId) {
            try {
                validMember = await validateOrgAccess(userId, targetOrgId, 'admin');
            } catch (e) {
                console.warn(`Header Org ID ${targetOrgId} invalid, trying fallback lookup...`);
                targetOrgId = null; // Mark as invalid to trigger fallback
            }
        }

        // 2. Fallback: Lookup fresh member record if needed
        if (!validMember) {
            const serviceClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: membership } = await serviceClient
                .from('organization_members')
                .select('organization_id, role, user_id') // Fetched for manual validation check if needed, but we used validateOrgAccess usually
                .eq('user_id', userId)
                .order('created_at', { ascending: false }) // Get most recent if multiple
                .limit(1)
                .maybeSingle();

            if (membership) {
                targetOrgId = membership.organization_id;
                // Validate again to ensure role permissions (or check here)
                validMember = await validateOrgAccess(userId, targetOrgId!, 'admin');
            }
        }

        if (!validMember || !targetOrgId) {
            return NextResponse.json({ error: 'Unauthorized: Not a member of any organization' }, { status: 403 });
        }

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await serviceClient
            .from('organizations')
            .update({ name, npi, tin })
            .eq('id', targetOrgId);

        if (error) {
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update org error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
