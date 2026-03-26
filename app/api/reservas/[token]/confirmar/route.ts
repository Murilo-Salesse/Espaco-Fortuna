

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

export async function POST(
  request: NextRequest,
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

    const { chave } = await request.json()

    const { data: reserva, error: erroBusca } = await supabaseAdmin
      .from('reservas')
      .select('*')
      .eq('token', token)
      .single()

    if (erroBusca || !reserva) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    if (!chave || chave !== reserva.chave) {
      return NextResponse.json({ error: 'Chave de segurança inválida.' }, { status: 403 })
    }

    if (reserva.status !== 'pendente') {
      return NextResponse.json(
        { error: `Esta reserva já está ${reserva.status}.` },
        { status: 409 }
      )
    }

    const { error: erroUpdate } = await supabaseAdmin
      .from('reservas')
      .update({ status: 'confirmada' })
      .eq('id', reserva.id)

    if (erroUpdate) throw erroUpdate

    const datas: { data: string; motivo: string; reserva_id: string }[] = []
    const inicio = new Date(reserva.data_inicio)
    const fim    = new Date(reserva.data_fim)
    const d      = new Date(inicio)

    while (d <= fim) {
      datas.push({
        data:       d.toISOString().split('T')[0],
        motivo:     'reserva_confirmada',
        reserva_id: reserva.id,
      })
      d.setDate(d.getDate() + 1)
    }

    const { error: erroBloquear } = await supabaseAdmin
      .from('datas_bloqueadas')
      .upsert(datas, { onConflict: 'data' }) 

    if (erroBloquear) throw erroBloquear

    return NextResponse.json({
      ok:      true,
      message: `Reserva de ${reserva.nome} confirmada. ${datas.length} data(s) bloqueada(s).`,
    })

  } catch (err) {
    console.error('[reservas/confirmar]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
