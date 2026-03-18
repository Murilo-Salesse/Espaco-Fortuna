

import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabase
    .from('configuracao')
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao buscar configuração.' }, { status: 500 })
  return NextResponse.json({ configuracao: data })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.cargo !== 2)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await request.json()

  const { data: existing } = await supabaseAdmin
    .from('configuracao')
    .select('id')
    .single()

  if (!existing) return NextResponse.json({ error: 'Configuração não encontrada.' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('configuracao')
    .update(body)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  return NextResponse.json({ configuracao: data })
}

