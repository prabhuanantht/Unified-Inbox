import { NextRequest, NextResponse } from 'next/server';

// NOTE: Avoid importing Better Auth in middleware; Edge runtime forbids dynamic
// code evaluation used by that package. Middleware will only exclude static
// assets and let requests pass through. Auth is enforced inside API routes/pages.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Always use a static matcher; runtime conditionals are not supported here.
  // Exclude Next.js assets and common static files to prevent auth redirects breaking CSS/JS.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public/|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
  ],
};
