

import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { MAX_FOTOS } from '@/lib/fotos'
import { normalizeOptionalText, normalizeText } from '@/lib/reservas'

const CONFIG_SELECT =
  'id, nome, descricao, localizacao, endereco, numero, ponto_referencia, whatsapp_admin, area_m2, capacidade, quartos, banheiros, vagas, comodidades, fotos'

function sanitizeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return parsed
}

function sanitizeStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => normalizeText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)
}

function sanitizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.startsWith('https://'))
    .slice(0, MAX_FOTOS)
}

export async function GET() {
  const { data, error } = await supabase
    .from('configuracao')
    .select(CONFIG_SELECT)
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao buscar configuração.' }, { status: 500 })
  return NextResponse.json({ configuracao: data })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || session.cargo !== ADMIN_CARGO)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await request.json()
  const payload = {
    nome: normalizeText(body.nome, 120),
    descricao: normalizeOptionalText(body.descricao, 2000),
    localizacao: normalizeOptionalText(body.localizacao, 160),
    endereco: normalizeOptionalText(body.endereco, 160),
    numero: normalizeOptionalText(body.numero, 20),
    ponto_referencia: normalizeOptionalText(body.ponto_referencia, 160),
    whatsapp_admin: normalizeText(body.whatsapp_admin, 24),
    area_m2: sanitizeInteger(body.area_m2),
    capacidade: sanitizeInteger(body.capacidade),
    quartos: sanitizeInteger(body.quartos),
    banheiros: sanitizeInteger(body.banheiros),
    vagas: sanitizeInteger(body.vagas),
    comodidades: sanitizeStringArray(body.comodidades, 50, 80),
    fotos: sanitizePhotoUrls(body.fotos),
  }

  if (!payload.nome || !payload.whatsapp_admin) {
    return NextResponse.json(
      { error: 'Nome e WhatsApp do administrador são obrigatórios.' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('configuracao')
    .select('id')
    .single()

  if (!existing) return NextResponse.json({ error: 'Configuração não encontrada.' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('configuracao')
    .update(payload)
    .eq('id', existing.id)
    .select(CONFIG_SELECT)
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  return NextResponse.json({ configuracao: data })
}
