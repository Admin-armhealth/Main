import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrgAccess } from '@/lib/server/authContext';

/**
 * POST /api/org/regenerate-key
 * Regenerates the organization's API key
 * Only admins/owners can perform this action
 */
export async function POST(req: NextRequest) {
    try {
        // 🛡️ SECURITY: Only admins can regenerate keys
        const authCtx = await requireOrgAccess('admin');
        if (!authCtx.ok) {
            return NextResponse.json({ error: authCtx.error }, { status: authCtx.status });
        }
        const { orgId, userId } = authCtx;

        // Generate new API key
        const newApiKey = generateSecureApiKey();

        // Update in database
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await serviceClient
            .from('organizations')
            .update({
                api_key: newApiKey,
                api_key_rotated_at: new Date().toISOString(),
                api_key_rotated_by: userId
            })
            .eq('id', orgId);

        if (error) {
            console.error('API Key Rotation Error:', error);
            return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
        }

        // Log the action
        await serviceClient.from('audit_logs').insert({
            organization_id: orgId,
            user_id: userId,
            action: 'api_key_rotated',
            details: { rotated_at: new Date().toISOString() }
        });

        console.log(`✅ API Key rotated for Org ${orgId} by User ${userId}`);

        return NextResponse.json({
            success: true,
            api_key: newApiKey,
            message: 'API key regenerated successfully. Please update any integrations using the old key.'
        });

    } catch (error) {
        console.error('API Key Rotation Exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Generate a secure random API key
 * Format: arm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars total)
 */
function generateSecureApiKey(): string {
    const prefix = 'arm_live_';
    const randomPart = crypto.randomUUID().replace(/-/g, '') +
        crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    return prefix + randomPart;
}
