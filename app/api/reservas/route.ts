

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { gerarToken, gerarChave } from '@/lib/tokens'

export async function GET() {
  const session = await getSession()
  if (!session || session.cargo !== 2)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, token, nome, email, telefone, data_inicio, data_fim, valor_total, status, criado_em')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao buscar reservas.' }, { status: 500 })
  return NextResponse.json({ reservas: data })
}

const rateLimitMap = new Map<string, { count: number, resetAt: number }>()

// ── POST — cria nova reserva (usuário) ────────────────────────
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()

    let record = rateLimitMap.get(ip)
    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + 60000 }
      rateLimitMap.set(ip, record)
    } else {
      record.count++
      if (record.count > 5) {
        return NextResponse.json(
          { error: 'Detectamos muitas tentativas simultâneas. Aguarde 1 minuto.' },
          { status: 429 }
        )
      }
    }

    const { nome, email, telefone, data_inicio, data_fim } = await request.json()

    if (!nome || !data_inicio || !data_fim) {
      return NextResponse.json(
        { error: 'Nome, data de início e data de fim são obrigatórios.' },
        { status: 400 }
      )
    }

    const inicio = new Date(data_inicio)
    const fim    = new Date(data_fim)

    if (inicio > fim) {
      return NextResponse.json(
        { error: 'A data de início não pode ser depois da data de fim.' },
        { status: 400 }
      )
    }

    const { data: datas_ocupadas } = await supabaseAdmin
      .from('datas_bloqueadas')
      .select('data')
      .gte('data', data_inicio)
      .lte('data', data_fim)

    if (datas_ocupadas && datas_ocupadas.length > 0) {
      const ocupadas = datas_ocupadas.map(d => d.data).join(', ')
      return NextResponse.json(
        { error: `As seguintes datas já estão bloqueadas: ${ocupadas}` },
        { status: 409 }
      )
    }

    const { data: precos } = await supabaseAdmin
      .from('precos')
      .select('tipo, valor')

    const precoMap: Record<string, number> = {}
    precos?.forEach(p => { precoMap[p.tipo] = Number(p.valor) })

    const FERIADOS = ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25']

    let valor_total = 0
    const d = new Date(inicio)
    while (d <= fim) {
      const diaSemana = d.getDay() 
      const mesdia    = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const isFeriado = FERIADOS.includes(mesdia)
      const isFds     = diaSemana === 0 || diaSemana === 6

      if (isFeriado)        valor_total += precoMap['feriado'] || 800
      else if (isFds)       valor_total += precoMap['fds']     || 600
      else                  valor_total += precoMap['semana']  || 350

      d.setDate(d.getDate() + 1)
    }

    let token = gerarToken()
    const chave = gerarChave()

    let tentativas = 0
    while (tentativas < 5) {
      const { data: existe } = await supabaseAdmin
        .from('reservas')
        .select('id')
        .eq('token', token)
        .single()
      if (!existe) break
      token = gerarToken()
      tentativas++
    }

    const { error } = await supabaseAdmin
      .from('reservas')
      .insert({
        token,
        chave,
        nome:        nome.trim(),
        email:       email?.trim() || null,
        telefone:    telefone?.trim() || null,
        data_inicio,
        data_fim,
        valor_total,
        status:      'pendente',
      })
      .select()
      .single()

    if (error) throw error

    const { data: config } = await supabaseAdmin
      .from('configuracao')
      .select('whatsapp_admin, nome')
      .single()

    const baseUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://espacofortuna.com.br'
    const linkConfirmar = `${baseUrl}/confirmar/${token}?chave=${chave}`

    const fmtData = (iso: string) => {
      const [y, m, d] = iso.split('-')
      return `${d}/${m}/${y}`
    }
    const periodo = data_inicio === data_fim
      ? fmtData(data_inicio)
      : `${fmtData(data_inicio)} → ${fmtData(data_fim)}`

    const noites = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1

    const mensagem = [
      `Olá! Quero reservar o ${config?.nome || 'Espaço Fortuna'}.`,
      ``,
      `*Período:* ${periodo}`,
      `*Diárias:* ${noites} ${noites === 1 ? 'dia' : 'dias'}`,
      `*Total:* R$ ${valor_total.toLocaleString('pt-BR')}`,
      ``,
      `*Nome:* ${nome}`,
      email    ? `*E-mail:* ${email}`    : null,
      telefone ? `*WhatsApp:* ${telefone}` : null,
      ``,
      `*Link de confirmação:* ${linkConfirmar}`,
    ].filter(Boolean).join('\n')

    const whatsappUrl = `https://wa.me/${config?.whatsapp_admin}?text=${encodeURIComponent(mensagem)}`

    return NextResponse.json({
      ok:          true,
      token,
      valor_total,
      whatsapp_url: whatsappUrl,
    })

  } catch (err) {
    console.error('[reservas/criar]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
