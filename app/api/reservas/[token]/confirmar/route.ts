

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { blockReservationDates, formatDisplayDate, getDateRange } from '@/lib/reservas'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    if (session.cargo !== ADMIN_CARGO) {
      return NextResponse.json(
        { error: 'Acesso negado. Somente administradores podem confirmar reservas.' },
        { status: 403 }
      )
    }

    const { data: reserva, error: erroBusca } = await supabaseAdmin
      .from('reservas')
      .select('id, nome, status, data_inicio, data_fim')
      .eq('token', token)
      .single()

    if (erroBusca || !reserva) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    if (reserva.status !== 'pendente') {
      return NextResponse.json(
        { error: `Esta reserva já está ${reserva.status}.` },
        { status: 409 }
      )
    }

    const dateRange = getDateRange(reserva.data_inicio, reserva.data_fim)
    if (!dateRange) {
      return NextResponse.json({ error: 'Período da reserva inválido.' }, { status: 400 })
    }

    const blockResult = await blockReservationDates(reserva.id, dateRange)
    if (blockResult.conflictDates.length > 0) {
      const datas = blockResult.conflictDates.map(formatDisplayDate).join(', ')
      return NextResponse.json(
        { error: `Estas datas já foram ocupadas por outra reserva: ${datas}` },
        { status: 409 }
      )
    }

    if (blockResult.errorMessage) {
      throw new Error(blockResult.errorMessage)
    }

    const { error: erroUpdate } = await supabaseAdmin
      .from('reservas')
      .update({ status: 'confirmada' })
      .eq('id', reserva.id)

    if (erroUpdate) {
      await supabaseAdmin.from('datas_bloqueadas').delete().eq('reserva_id', reserva.id)
      throw erroUpdate
    }

    return NextResponse.json({
      ok:      true,
      message: `Reserva de ${reserva.nome} confirmada. ${dateRange.length} data(s) bloqueada(s).`,
    })

  } catch (err) {
    console.error('[reservas/confirmar]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
