import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// The Matcher is now a top-level export, just like before
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, fonts, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

/**
 * Next.js Middleware (Proxy)
 * 
 * Intercepts requests to enforce route protection and refresh Supabase auth sessions.
 * 
 * 1. Initializes a Supabase Server Client using the current request/response cookies.
 * 2. Fetches the current user to refresh their session proactively.
 * 3. Bouncer Logic: Secures the `/todo` route by redirecting unauthenticated users to `/login`.
 * 
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} The outgoing HTTP response (or redirect)
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Refresh the session (this keeps the user logged in)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Route Protection (The "Bouncer" Logic)
  // If user tries to go to /todo without a session, bounce them to login
  if (request.nextUrl.pathname.startsWith('/todo') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}