import { NextRequest, NextResponse } from 'next/server';
import { validateOrgAccess } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: requestId } = await params;

        // 🛡️ SECURITY: ORGANIZATION ACCESS CONTROL
        const userId = req.headers.get('x-user-id');
        const orgId = req.headers.get('x-organization-id');

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Missing Organization Context Headers' }, { status: 401 });
        }

        try {
            await validateOrgAccess(userId, orgId, 'readonly'); // Even read-only can view
        } catch (authErr: any) {
            console.warn(`🚨 SECURITY ALERT: ${authErr.message}`);
            return NextResponse.json({ error: authErr.message }, { status: 403 });
        }

        // Fetch the request using Service Role
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: request, error } = await serviceClient
            .from('requests')
            .select('*')
            .eq('id', requestId)
            .maybeSingle();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // 🛡️ BOLA CHECK: Verify the request belongs to the user's organization
        if (request.organization_id !== orgId) {
            console.warn(`🚨 BOLA ATTACK DETECTED: User ${userId} (Org ${orgId}) attempted to access Request ${requestId} (Org ${request.organization_id})`);
            return NextResponse.json({ error: 'Request not found' }, { status: 404 }); // Return 404 instead of 403 to avoid leaking existence
        }

        return NextResponse.json(request);

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
