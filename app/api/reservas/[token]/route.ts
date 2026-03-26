

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

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
    .select('id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status')
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
    const { 
      status, 
      contrato, 
      contrato_assinado, 
      valor_pago, 
      saldo, 
      pgto_detalhes 
    } = body

    const { data: reserva, error } = await supabaseAdmin
      .from('reservas')
      .update({
        status,
        contrato,
        contrato_assinado,
        valor_pago,
        saldo,
        pgto_detalhes
      })
      .eq('token', token)
      .select()
      .single()

    if (error) {
      console.error('[API Update Reserva Error]:', error)
      return NextResponse.json({ error: 'Erro ao atualizar reserva.' }, { status: 500 })
    }

    
    if (status === 'cancelada') {
      await supabaseAdmin
        .from('datas_bloqueadas')
        .delete()
        .eq('reserva_id', reserva.id)
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
      .select('id')
      .eq('token', token)
      .single()

    if (findError || !reserva) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('reservas')
      .delete()
      .eq('id', reserva.id)

    if (deleteError) {
      console.error('[API Delete Reserva Error]:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar reserva.' }, { status: 500 })
    }

    
    
    
    
    await supabaseAdmin
      .from('datas_bloqueadas')
      .delete()
      .eq('reserva_id', reserva.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE Reserva Error]:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}


