import { NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/auth';

export async function middleware(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ 
      headers: request.headers 
    });

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/register'];
    const isPublicRoute = publicRoutes.some(route => 
      request.nextUrl.pathname === route
    );

    // Allow public routes and auth API routes
    if (isPublicRoute || request.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!session?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Add user info to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-role', (session.user as any).role || 'EDITOR');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login
    if (!request.nextUrl.pathname.startsWith('/api/auth') && 
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/register') &&
        request.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
