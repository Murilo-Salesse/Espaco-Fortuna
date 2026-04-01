import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { consumeRateLimit } from '@/lib/rate-limit'
import {
  blockReservationDates,
  calculateReservationTotal,
  findBlockedDates,
  formatDisplayDate,
  getDateRange,
  isReservaStatus,
  MAX_RESERVA_DAYS,
  normalizeCurrencyValue,
  normalizeOptionalText,
  normalizeText,
} from '@/lib/reservas'
import { getClientIp } from '@/lib/security'
import { supabaseAdmin } from '@/lib/supabase'
import { gerarChave, gerarToken } from '@/lib/tokens'

const RESERVA_SELECT =
  'id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status, criado_em, contrato, contrato_assinado, valor_pago, saldo, pgto_detalhes'

function formatBlockedDates(dateRange: string[]): string {
  return dateRange.map(formatDisplayDate).join(', ')
}

export async function GET() {
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select(RESERVA_SELECT)
    .order('criado_em', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar reservas.' }, { status: 500 })
  }

  return NextResponse.json({ reservas: data })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const isAdmin = session?.cargo === ADMIN_CARGO

    if (!isAdmin) {
      const limit = await consumeRateLimit({
        namespace: 'reservas:criar',
        identifier: getClientIp(request.headers),
        limit: 5,
        windowSeconds: 10 * 60,
        blockSeconds: 10 * 60,
      })

      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Muitas tentativas em sequência. Aguarde alguns minutos.' },
          {
            status: 429,
            headers: { 'Retry-After': String(limit.retryAfter || 60) },
          }
        )
      }
    }

    const body = await request.json()
    const nome = normalizeText(body.nome, 120)
    const email = normalizeOptionalText(body.email, 160)
    const telefone = normalizeOptionalText(body.telefone, 40)
    const data_inicio = typeof body.data_inicio === 'string' ? body.data_inicio : ''
    const data_fim = typeof body.data_fim === 'string' ? body.data_fim : ''
    const manualStatus =
      isAdmin && isReservaStatus(body.status) ? body.status : 'pendente'
    const contrato = isAdmin ? normalizeOptionalText(body.contrato, 120) : null
    const valor_pago = isAdmin ? normalizeCurrencyValue(body.valor_pago) ?? 0 : 0
    const pgto_detalhes = isAdmin ? normalizeOptionalText(body.pgto_detalhes, 2000) : null

    if (!nome || !data_inicio || !data_fim) {
      return NextResponse.json(
        { error: 'Nome, data de início e data de fim são obrigatórios.' },
        { status: 400 }
      )
    }

    const dateRange = getDateRange(data_inicio, data_fim)
    if (!dateRange) {
      return NextResponse.json({ error: 'Período da reserva inválido.' }, { status: 400 })
    }

    if (dateRange.length > MAX_RESERVA_DAYS) {
      return NextResponse.json(
        { error: `O período máximo permitido é de ${MAX_RESERVA_DAYS} dias.` },
        { status: 400 }
      )
    }

    const blockedDates = await findBlockedDates(dateRange)
    if (blockedDates.length > 0) {
      return NextResponse.json(
        { error: `As seguintes datas já estão bloqueadas: ${formatBlockedDates(blockedDates)}` },
        { status: 409 }
      )
    }

    const valor_total = await calculateReservationTotal(dateRange)

    let token = gerarToken()
    const chave = gerarChave()

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: existing } = await supabaseAdmin
        .from('reservas')
        .select('id')
        .eq('token', token)
        .maybeSingle()

      if (!existing) break
      token = gerarToken()
    }

    const { data: novaReserva, error } = await supabaseAdmin
      .from('reservas')
      .insert({
        token,
        chave,
        nome,
        email,
        telefone,
        data_inicio,
        data_fim,
        valor_total,
        status: manualStatus,
        contrato,
        valor_pago,
        saldo: Math.max(0, valor_total - valor_pago),
        pgto_detalhes,
      })
      .select(RESERVA_SELECT)
      .single()

    if (error || !novaReserva) {
      throw error ?? new Error('Falha ao criar reserva.')
    }

    if (manualStatus === 'confirmada') {
      const blockResult = await blockReservationDates(novaReserva.id, dateRange)

      if (blockResult.conflictDates.length > 0) {
        await supabaseAdmin.from('reservas').delete().eq('id', novaReserva.id)

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
        await supabaseAdmin.from('reservas').delete().eq('id', novaReserva.id)

        return NextResponse.json({ error: 'Erro ao bloquear as datas da reserva.' }, { status: 500 })
      }
    }

    const { data: config } = await supabaseAdmin
      .from('configuracao')
      .select('whatsapp_admin, nome')
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://espacofortuna.com.br'
    const linkConfirmar = `${baseUrl}/confirmar/${token}`

    const periodo =
      data_inicio === data_fim
        ? formatDisplayDate(data_inicio)
        : `${formatDisplayDate(data_inicio)} → ${formatDisplayDate(data_fim)}`

    const mensagem = [
      `Olá! Quero reservar o ${config?.nome || 'Espaço Fortuna'}.`,
      '',
      `*Período:* ${periodo}`,
      `*Diárias:* ${dateRange.length} ${dateRange.length === 1 ? 'dia' : 'dias'}`,
      `*Total:* R$ ${valor_total.toLocaleString('pt-BR')}`,
      '',
      `*Nome:* ${nome}`,
      email ? `*E-mail:* ${email}` : null,
      telefone ? `*WhatsApp:* ${telefone}` : null,
      '',
      `*Link de confirmação:* ${linkConfirmar}`,
    ]
      .filter(Boolean)
      .join('\n')

    const whatsappUrl = `https://wa.me/${config?.whatsapp_admin}?text=${encodeURIComponent(mensagem)}`

    return NextResponse.json({
      ok: true,
      token,
      valor_total,
      whatsapp_url: whatsappUrl,
      reserva: novaReserva,
    })
  } catch (err) {
    console.error('[reservas/criar]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
