
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const next = requestUrl.searchParams.get('next') || '/';

    const cookieStore = {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: any[]) => {
            cookies.forEach(cookie => {
                request.cookies.set(cookie);
            });
        },
    };

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                },
            },
        }
    );

    // Sign out from Supabase (clears server-side session)
    await supabase.auth.signOut();

    const response = NextResponse.redirect(new URL(next, request.url));

    // Explicitly clear cookies in response to be safe
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    // Also clear our custom org cookie
    response.cookies.delete('org_id');

    return response;
}
