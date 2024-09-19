import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const publicRoutes = ['/login'];

const isDevMode = process.env.NODE_ENV === 'development';

export default async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isPublicRoute = publicRoutes.includes(path);

    const cookie = cookies().get('session')?.value;
    const session = cookie;

    if (!isPublicRoute && !session && !isDevMode) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}