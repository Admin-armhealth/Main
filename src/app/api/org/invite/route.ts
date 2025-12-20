import { NextRequest, NextResponse } from 'next/server';
import { validateOrgAccess } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { email, role } = await req.json();

        const userId = req.headers.get('x-user-id');
        const orgId = req.headers.get('x-organization-id');

        if (!userId) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
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

        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Fallback: Lookup fresh member record if needed
        if (!validMember) {
            const { data: membership } = await serviceClient
                .from('organization_members')
                .select('organization_id, role')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (membership) {
                targetOrgId = membership.organization_id;
                // Validate again
                validMember = await validateOrgAccess(userId, targetOrgId!, 'admin');
            }
        }

        if (!validMember || !targetOrgId) {
            return NextResponse.json({ error: 'Unauthorized: Not a member of this organization' }, { status: 403 });
        }

        // Generate invite token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

        const { error } = await serviceClient
            .from('invites')
            .insert({
                organization_id: targetOrgId,
                email,
                role,
                token,
                expires_at: expiresAt.toISOString()
            });

        if (error) {
            return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
        }

        // Generate invite link (Production Ready)
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/invite/${token}`;

        return NextResponse.json({
            success: true,
            inviteLink
        });

    } catch (error) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
