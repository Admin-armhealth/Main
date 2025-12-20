import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return request.cookies.get(name)?.value
                },
                set(name, value, options) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name, options) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // 2. Refreshes session if needed
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Header Injection for API Routes
    if (user) {
        response.headers.set('x-user-id', user.id)

        // Attempt to get org_id from cookie or metadata
        // We try cookie first as it's the active selector
        let orgId = request.cookies.get('org_id')?.value

        if (!orgId) {
            // Fallback: check metadata (if we had it easily, but getUser is lightweight)
            // If still no org, the API will likely fail with 401 later, which is fine.
        }

        if (orgId) {
            response.headers.set('x-organization-id', orgId)
        }
    }

    // 4. Protected Routes
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/settings') ||
        request.nextUrl.pathname.startsWith('/history')

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 5. Auth Routes (redirect if already logged in)
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        (request.nextUrl.pathname.startsWith('/signup') && !request.nextUrl.searchParams.get('org')) // Allow invite signups

    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
