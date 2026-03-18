

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createToken, sessionCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()

    if (!email || !senha) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      )
    }

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, senha_hash, cargo')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !usuario) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        { status: 401 }
      )
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash)
    if (!senhaCorreta) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos.' },
        { status: 401 }
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

    return response

  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
