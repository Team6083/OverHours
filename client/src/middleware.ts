import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const publicRoutes = ['/login'];

const isDevMode = process.env.NODE_ENV === 'development';

export default auth(async (req) => {
  const session = await auth();

  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  if (!session && !isPublicRoute && !isDevMode) {
    return NextResponse.redirect('/login');
  }

  return undefined;
});

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
