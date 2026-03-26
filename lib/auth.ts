import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'fortuna_session'
const EXPIRES_IN  = '7d'

import { ADMIN_CARGO } from './constants'

export interface SessionPayload {
  id:    string
  nome:  string
  email: string
  cargo: number
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRES_IN)
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function sessionCookieOptions(token: string) {
  return {
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  }
}

export function clearCookieOptions() {
  return {
    name:    COOKIE_NAME,
    value:   '',
    maxAge:  0,
    path:    '/',
  }
}
