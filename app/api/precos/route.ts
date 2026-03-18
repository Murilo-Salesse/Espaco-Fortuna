

import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

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
  if (!session || session.cargo !== 2)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { precos } = await request.json() 

  for (const p of precos) {
    await supabaseAdmin
      .from('precos')
      .update({ valor: p.valor })
      .eq('tipo', p.tipo)
  }

  return NextResponse.json({ ok: true })
}
