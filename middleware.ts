import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Dev bypass: allow everything when enabled (and avoid importing auth/prisma)
  if (process.env.DEV_DISABLE_AUTH === 'true') {
    return NextResponse.next();
  }

  try {
    // Dynamically import auth only when needed to avoid Edge bundling issues
    const { auth } = await import('./lib/auth');

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
    // On error, allow the request to proceed in dev rather than blocking the app
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    // In production, redirect to login on error
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
  // Always use a static matcher; runtime conditionals are not supported here.
  // Exclude Next.js assets and common static files to prevent auth redirects breaking CSS/JS.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public/|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
  ],
};
