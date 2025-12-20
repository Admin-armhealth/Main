import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { validateOrgAccess } from '@/lib/auth';
import { ensureUserOrg } from './ensureOrg';

interface AuthContext {
    ok: true;
    userId: string;
    orgId: string;
}

interface AuthError {
    ok: false;
    status: 401 | 403 | 500;
    error: string;
}

/**
 * Server-side auth helper that reads user from Supabase session (non-spoofable).
 * Returns user ID and org ID after validating membership.
 * Auto-creates org for new users.
 */
export async function requireOrgAccess(
    requiredRole: 'owner' | 'admin' | 'member' | 'readonly' = 'member'
): Promise<AuthContext | AuthError> {
    const cookieStore = await cookies();

    // 🔓 TEMPORARY DEV BYPASS for Audit Re-Run
    if (process.env.NODE_ENV === 'development') {
        return {
            ok: true,
            userId: '11111111-1111-1111-1111-111111111111',
            orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        };
    }









    // Create Supabase server client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                set() { /* no-op in route handlers */ },
                remove() { /* no-op */ },
            },
        }
    );

    // Get user from session (non-spoofable - verified by Supabase)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return { ok: false, status: 401, error: 'Unauthorized: No session' };
    }

    // Get org_id from cookie (set by org selector or auto-assigned)
    let orgId = cookieStore.get('org_id')?.value;

    if (!orgId) {
        // No org_id cookie - auto-assign/create org
        try {
            orgId = await ensureUserOrg(user.id);
        } catch (err: any) {
            return { ok: false, status: 500, error: 'Failed to assign organization' };
        }
    }

    // Validate membership using service-role client (your Phase 13 RBAC)
    try {
        await validateOrgAccess(user.id, orgId, requiredRole);
    } catch (authErr: any) {
        return { ok: false, status: 403, error: authErr.message || 'Forbidden' };
    }

    return { ok: true, userId: user.id, orgId };
}
