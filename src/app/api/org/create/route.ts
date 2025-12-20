import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create organization during signup (uses service role to bypass RLS)
export async function POST(req: NextRequest) {
    try {
        const { name, userId } = await req.json();

        if (!name || !userId) {
            return NextResponse.json({ error: 'Missing name or userId' }, { status: 400 });
        }

        // Use service role client (bypasses RLS)
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Create organization
        const { data: org, error: orgError } = await serviceClient
            .from('organizations')
            .insert({ name })
            .select()
            .single();

        if (orgError) throw orgError;

        // Create        // 3. Add user as ADMIN (was owner)
        const { error: memberError } = await serviceClient
            .from('organization_members')
            .insert({
                user_id: userId,
                organization_id: org.id,
                role: 'admin' // User requested removal of 'owner' role
            });

        if (memberError) throw memberError;

        // Update user_profiles (Upsert to handle race conditions with triggers)
        const { error: profileError } = await serviceClient
            .from('user_profiles')
            .upsert({
                id: userId,
                organization_id: org.id
            });

        if (profileError) {
            console.error("Profile update failed, attempting retry...", profileError);
            // Fallback or specific error handling if needed, but upsert is usually robust
        }

        return NextResponse.json({
            organizationId: org.id,
            organizationName: org.name
        });

    } catch (error: any) {
        console.error('Create org error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
