import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAccess } from '@/lib/server/authContext';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const { orgId } = await req.json();

        if (!orgId) {
            return NextResponse.json({ error: 'Missing org ID' }, { status: 400 });
        }

        // Validate that user belongs to this org (using 'readonly' as minimum)
        const authCtx = await requireOrgAccess('readonly');
        if (!authCtx.ok) {
            return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
        }

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('org_id', orgId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Org select error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
