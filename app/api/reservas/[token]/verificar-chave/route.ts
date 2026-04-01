

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const { data: reserva, error } = await supabaseAdmin
    .from('reservas')
    .select('id, status')
    .eq('token', token)
    .single()

  if (error || !reserva) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  if (reserva.status !== 'pendente') {
    return NextResponse.json({ error: `Esta reserva já está ${reserva.status}.` }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
