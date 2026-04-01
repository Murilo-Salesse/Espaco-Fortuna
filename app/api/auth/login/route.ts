

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createToken, sessionCookieOptions } from '@/lib/auth'
import { getClientIp } from '@/lib/security'
import { consumeRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : ''
    const ip = getClientIp(request.headers)

    if (!normalizedEmail || typeof senha !== 'string' || !senha) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({
        namespace: 'auth:ip',
        identifier: ip,
        limit: 10,
        windowSeconds: 15 * 60,
        blockSeconds: 15 * 60,
      }),
      consumeRateLimit({
        namespace: 'auth:email',
        identifier: normalizedEmail,
        limit: 5,
        windowSeconds: 15 * 60,
        blockSeconds: 15 * 60,
      }),
    ])

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfter, emailLimit.retryAfter, 60)

      return NextResponse.json(
        { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, senha_hash, cargo')
      .eq('email', normalizedEmail)
      .single()

    if (error || !usuario) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash)
    if (!senhaCorreta) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    const token = await createToken({
      id:    usuario.id,
      nome:  usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo,
    })

    const response = NextResponse.json({
      usuario: {
        id:    usuario.id,
        nome:  usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
      }
    })

    response.cookies.set(sessionCookieOptions(token))
    response.headers.set('Cache-Control', 'no-store')

    return response

  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
