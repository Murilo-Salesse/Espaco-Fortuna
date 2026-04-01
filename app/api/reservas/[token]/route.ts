import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import {
  blockReservationDates,
  formatDisplayDate,
  getDateRange,
  isReservaStatus,
  normalizeCurrencyValue,
  normalizeOptionalText,
  unblockReservationDates,
} from '@/lib/reservas'
import { supabaseAdmin } from '@/lib/supabase'

const RESERVA_PUBLIC_SELECT =
  'id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status'

const RESERVA_EDIT_SELECT =
  'id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status, contrato, contrato_assinado, valor_pago, saldo, pgto_detalhes'

function formatBlockedDates(dateRange: string[]): string {
  return dateRange.map(formatDisplayDate).join(', ')
}

export async function GET(
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
    .select(RESERVA_PUBLIC_SELECT)
    .eq('token', token)
    .single()

  if (error || !reserva) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ reserva })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const { data: currentReserva, error: currentError } = await supabaseAdmin
      .from('reservas')
      .select('id, status, data_inicio, data_fim, valor_total, valor_pago')
      .eq('token', token)
      .single()

    if (currentError || !currentReserva) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    const nextStatus = isReservaStatus(body.status) ? body.status : currentReserva.status
    const valorPagoInformado =
      body.valor_pago === undefined ? null : normalizeCurrencyValue(body.valor_pago)

    if (body.valor_pago !== undefined && valorPagoInformado === null) {
      return NextResponse.json({ error: 'Valor pago inválido.' }, { status: 400 })
    }

    const valor_pago = valorPagoInformado ?? Number(currentReserva.valor_pago ?? 0)
    const saldo = Math.max(0, Number(currentReserva.valor_total) - valor_pago)

    const updatePayload = {
      status: nextStatus,
      contrato: normalizeOptionalText(body.contrato, 120),
      contrato_assinado: Boolean(body.contrato_assinado),
      valor_pago,
      saldo,
      pgto_detalhes: normalizeOptionalText(body.pgto_detalhes, 2000),
    }

    const dateRange = getDateRange(currentReserva.data_inicio, currentReserva.data_fim)
    if (!dateRange) {
      return NextResponse.json({ error: 'Período da reserva inválido.' }, { status: 400 })
    }

    if (currentReserva.status !== 'confirmada' && nextStatus === 'confirmada') {
      const blockResult = await blockReservationDates(currentReserva.id, dateRange)

      if (blockResult.conflictDates.length > 0) {
        return NextResponse.json(
          {
            error: `Não foi possível confirmar a reserva porque estas datas já foram ocupadas: ${formatBlockedDates(
              blockResult.conflictDates
            )}`,
          },
          { status: 409 }
        )
      }

      if (blockResult.errorMessage) {
        throw new Error(blockResult.errorMessage)
      }

      const { data: reserva, error } = await supabaseAdmin
        .from('reservas')
        .update(updatePayload)
        .eq('id', currentReserva.id)
        .select(RESERVA_EDIT_SELECT)
        .single()

      if (error || !reserva) {
        await supabaseAdmin.from('datas_bloqueadas').delete().eq('reserva_id', currentReserva.id)
        return NextResponse.json({ error: 'Erro ao atualizar reserva.' }, { status: 500 })
      }

      return NextResponse.json({ reserva })
    }

    const { data: reserva, error } = await supabaseAdmin
      .from('reservas')
      .update(updatePayload)
      .eq('id', currentReserva.id)
      .select(RESERVA_EDIT_SELECT)
      .single()

    if (error || !reserva) {
      return NextResponse.json({ error: 'Erro ao atualizar reserva.' }, { status: 500 })
    }

    if (currentReserva.status === 'confirmada' && nextStatus !== 'confirmada') {
      try {
        await unblockReservationDates(currentReserva.id)
      } catch (unblockError) {
        await supabaseAdmin
          .from('reservas')
          .update({ status: currentReserva.status })
          .eq('id', currentReserva.id)

        throw unblockError
      }
    }

    return NextResponse.json({ reserva })
  } catch (err) {
    console.error('[PUT Reserva Error]:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  try {
    const { data: reserva, error: findError } = await supabaseAdmin
      .from('reservas')
      .select('id, status')
      .eq('token', token)
      .single()

    if (findError || !reserva) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    if (reserva.status === 'confirmada') {
      await unblockReservationDates(reserva.id)
    }

    const { error: deleteError } = await supabaseAdmin
      .from('reservas')
      .delete()
      .eq('id', reserva.id)

    if (deleteError) {
      console.error('[API Delete Reserva Error]:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar reserva.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE Reserva Error]:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
