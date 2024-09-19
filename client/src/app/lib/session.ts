import 'server-only'

import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session'

export async function createSession(token: string) {
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000)
    const session = token;

    cookies().set(SESSION_COOKIE_NAME, session, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}

export function deleteSession() {
    cookies().delete(SESSION_COOKIE_NAME)
}