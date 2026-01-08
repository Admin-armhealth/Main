
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // API route
                },
                remove(name: string, options: CookieOptions) {
                    // API route
                },
            },
        }
    );

    try {
        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { request_type, title, status, input_data, output_data } = body;

        // 3. Get User Profile for Organization (if needed for RLS or insertion)
        // For now, we rely on RLS, but if org_id is required in the table (it is optional in schema), we can fetch it.
        // Let's fetch it to be safe and explicit.
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        const organization_id = profile?.organization_id || null;

        // 4. Insert Request
        // Note: 'requests' table RLS "Users can insert requests" requires auth.uid() = user_id
        const { data, error } = await supabase
            .from('requests')
            .insert({
                user_id: user.id,
                organization_id: organization_id,
                request_type,
                title,
                status: status || 'completed',
                input_data,
                output_data,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, request: data });

    } catch (e: any) {
        console.error('Create Request Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
