

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getSession()
  if (!session || session.cargo !== 2) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const { data: reserva, error } = await supabaseAdmin
    .from('reservas')
    .select('id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status')
    .eq('token', token)
    .single()

  if (error || !reserva) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ reserva })
}
