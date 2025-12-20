import { NextRequest, NextResponse } from 'next/server';
import { validateOrgAccess } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, target_resource, details } = body;

        // 🛡️ SECURITY: ORGANIZATION ACCESS CONTROL
        const userId = req.headers.get('x-user-id');
        const orgId = req.headers.get('x-organization-id');

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Missing Organization Context Headers' }, { status: 401 });
        }

        try {
            await validateOrgAccess(userId, orgId, 'member');
        } catch (authErr: any) {
            console.warn(`🚨 SECURITY ALERT: ${authErr.message}`);
            return NextResponse.json({ error: authErr.message }, { status: 403 });
        }

        // Insert audit log
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await serviceClient
            .from('audit_logs')
            .insert({
                organization_id: orgId,
                user_id: userId,
                action,
                target_resource,
                details
            })
            .select()
            .single();

        if (error) {
            console.error('Audit log error:', error);
            return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // 🛡️ SECURITY: ORGANIZATION ACCESS CONTROL
        const userId = req.headers.get('x-user-id');
        const orgId = req.headers.get('x-organization-id');

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Missing Organization Context Headers' }, { status: 401 });
        }

        try {
            // Only admins and owners can view audit logs
            await validateOrgAccess(userId, orgId, 'admin');
        } catch (authErr: any) {
            console.warn(`🚨 SECURITY ALERT: ${authErr.message}`);
            return NextResponse.json({ error: authErr.message }, { status: 403 });
        }

        // Fetch audit logs for the organization
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await serviceClient
            .from('audit_logs')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Audit log fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// 🛡️ IMMUTABILITY: Audit logs are append-only. DELETE and PATCH are forbidden.
export async function DELETE() {
    return NextResponse.json({ error: 'Audit logs are immutable. DELETE operation not allowed.' }, { status: 403 });
}

export async function PATCH() {
    return NextResponse.json({ error: 'Audit logs are immutable. UPDATE operation not allowed.' }, { status: 403 });
}

export async function PUT() {
    return NextResponse.json({ error: 'Audit logs are immutable. UPDATE operation not allowed.' }, { status: 403 });
}
