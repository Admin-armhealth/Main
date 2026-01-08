
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) { },
                remove(name: string, options: CookieOptions) { },
            },
        }
    );

    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        let dbQuery = supabase
            .from('policies')
            .select(`
                id,
                title,
                payer,
                updated_at,
                policy_codes (
                    code,
                    code_type
                )
            `)
            .eq('status', 'active');

        if (query) {
            dbQuery = dbQuery.ilike('title', `%${query}%`);
        }

        const { data: policies, error } = await dbQuery.order('updated_at', { ascending: false });

        if (error) {
            console.error("Policy List Error:", error);
            throw error;
        }

        console.log(`API: Found ${policies?.length} policies for user.`);
        return NextResponse.json({ policies });
    } catch (e: any) {
        console.error("Policy API Crash:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
