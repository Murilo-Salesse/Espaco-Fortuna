import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'fortuna_session'
const EXPIRES_IN  = '24h'
const JWT_ISSUER = 'fortuna'
const JWT_AUDIENCE = 'fortuna-admin'

export interface SessionPayload {
  id:    string
  nome:  string
  email: string
  cargo: number
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(payload.id)
    .setExpirationTime(EXPIRES_IN)
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.id !== 'string' ||
      typeof payload.nome !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.cargo !== 'number'
    ) {
      return null
    }

    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await verifyToken(token)
  if (!session) return null

  const { supabaseAdmin } = await import('./supabase')
  const { data: usuario, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, cargo')
    .eq('id', session.id)
    .single()

  if (error || !usuario) {
    return null
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cargo: usuario.cargo,
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24,
    path:     '/',
    priority: 'high' as const,
  }
}

export function clearCookieOptions() {
  return {
    name:    COOKIE_NAME,
    value:   '',
    maxAge:  0,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:    '/',
  }
}
