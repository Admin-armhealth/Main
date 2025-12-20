
import { createClient } from '@supabase/supabase-js';
import { supabase as publicClient } from './supabaseClient';

// Server-side admin client for secure logging (Bypass RLS)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

if (!serviceRoleKey && typeof window === 'undefined') {
    // Only warn on server side
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Audit logs may fail RLS.');
}

const adminClient = (serviceRoleKey && supabaseUrl)
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    })
    : null;

/**
 * Log an audit event.
 * Safe to call from Client or Server.
 * - Server: Uses Service Role (if available) to guarantee insert.
 * - Client: Uses Public Client (subject to RLS 'auth.role() = authenticated').
 */
export async function logAudit(params: {
    action: string;
    resourceId?: string;
    metadata?: any;
    userId?: string; // Optional, force specific user ID (Server only)
    orgId?: string;  // Optional, force specific org ID (Server only)
}) {
    // 1. Determine which client to use
    // If we have a service key, use adminClient (Server-side reliable logging)
    // Otherwise fall back to publicClient (Client-side RLS logging)
    const client = adminClient || publicClient;

    try {
        let userId = params.userId;
        let orgId = params.orgId;

        // 2. If User ID is missing, try to resolve it (Client side)
        if (!userId && client === publicClient) {
            const { data: { user } } = await client.auth.getUser();
            userId = user?.id;
        }

        // 3. If Org ID is missing, try to resolve from profile (if we have a user)
        if (userId && !orgId) {
            const { data: profile } = await client
                .from('user_profiles')
                .select('organization_id')
                .eq('id', userId)
                .single();
            orgId = profile?.organization_id;
        }

        // 4. Insert Log
        const { error } = await client.from('audit_logs').insert({
            action_type: params.action,
            resource_id: params.resourceId,
            metadata: params.metadata || {},
            user_id: userId,
            organization_id: orgId
        });

        if (error) {
            console.error('Audit Log Failed:', error);
            // In high-security compliance, we might want to throw here. 
            // For now, just error console to avoid breaking the user flow.
        }
    } catch (err) {
        console.error('Audit Log Exception:', err);
    }
}
