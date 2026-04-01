

import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

const PRECO_TIPOS = new Set(['semana', 'fds', 'feriado'])

export async function GET() {
  const { data, error } = await supabase
    .from('precos')
    .select('tipo, label, valor')
    .order('tipo')

  if (error) return NextResponse.json({ error: 'Erro ao buscar preços.' }, { status: 500 })
  return NextResponse.json({ precos: data })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { precos } = await request.json() 
  if (!Array.isArray(precos) || precos.length === 0) {
    return NextResponse.json({ error: 'Nenhum preço informado.' }, { status: 400 })
  }

  const sanitized = precos
    .map((preco) => ({
      tipo: typeof preco?.tipo === 'string' ? preco.tipo : '',
      valor: Number(preco?.valor),
    }))
    .filter((preco) => PRECO_TIPOS.has(preco.tipo))

  if (sanitized.length === 0 || sanitized.some((preco) => !Number.isFinite(preco.valor) || preco.valor < 0)) {
    return NextResponse.json({ error: 'Tabela de preços inválida.' }, { status: 400 })
  }

  const results = await Promise.all(
    sanitized.map((preco) =>
      supabaseAdmin
      .from('precos')
        .update({ valor: preco.valor })
        .eq('tipo', preco.tipo)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) {
    return NextResponse.json({ error: 'Erro ao atualizar preços.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
