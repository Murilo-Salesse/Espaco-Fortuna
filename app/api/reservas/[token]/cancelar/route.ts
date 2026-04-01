

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { unblockReservationDates } from '@/lib/reservas'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const session = await getSession()
    if (!session)          return NextResponse.json({ error: 'Não autenticado.' },   { status: 401 })
    if (session.cargo !== ADMIN_CARGO) return NextResponse.json({ error: 'Acesso negado.' },   { status: 403 })

    const { data: reserva, error } = await supabaseAdmin
      .from('reservas')
      .select('id, nome, status')
      .eq('token', token)
      .single()

    if (error || !reserva) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    if (reserva.status === 'cancelada') return NextResponse.json({ error: 'Reserva já cancelada.' }, { status: 409 })

    const { error: updateError } = await supabaseAdmin
      .from('reservas')
      .update({ status: 'cancelada' })
      .eq('id', reserva.id)

    if (updateError) {
      throw updateError
    }

    if (reserva.status === 'confirmada') {
      await unblockReservationDates(reserva.id)
    }

    return NextResponse.json({ ok: true, message: `Reserva de ${reserva.nome} cancelada.` })

  } catch (err) {
    console.error('[reservas/cancelar]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
