import { supabaseAdmin } from './supabase'
import { isIsoDateString } from './security'
import { getPrecoConfig, getPrecoTipo } from './precos'

export const RESERVA_STATUS = ['pendente', 'confirmada', 'cancelada'] as const
export const MAX_RESERVA_DAYS = 31

export type ReservaStatus = (typeof RESERVA_STATUS)[number]

export function isReservaStatus(value: unknown): value is ReservaStatus {
  return typeof value === 'string' && RESERVA_STATUS.includes(value as ReservaStatus)
}

export function normalizeText(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null

  return normalized.slice(0, maxLength)
}

export function normalizeOptionalText(value: unknown, maxLength = 255): string | null {
  return normalizeText(value, maxLength)
}

export function normalizeCurrencyValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100) / 100
}

export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !isIsoDateString(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return parsed
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getDateRange(start: string, end: string): string[] | null {
  const startDate = parseIsoDate(start)
  const endDate = parseIsoDate(end)

  if (!startDate || !endDate || startDate > endDate) return null

  const dates: string[] = []
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    dates.push(formatIsoDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export async function calculateReservationTotal(dateRange: string[]): Promise<number> {
  const { data: precos, error } = await supabaseAdmin
    .from('precos')
    .select('tipo, valor')

  if (error) {
    throw error
  }

  const precoMap: Record<string, number> = {}
  precos?.forEach((preco) => {
    precoMap[preco.tipo] = Number(preco.valor)
  })

  return dateRange.reduce((total, isoDate) => {
    const date = parseIsoDate(isoDate)
    if (!date) return total

    const tipo = getPrecoTipo(date.getUTCMonth(), date.getUTCDay(), date.getUTCDate())
    const fallback = getPrecoConfig(tipo)?.fallback ?? 0

    return total + (precoMap[tipo] || fallback)
  }, 0)
}

export async function findBlockedDates(
  dateRange: string[],
  excludeReservaId?: string
): Promise<string[]> {
  if (dateRange.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('datas_bloqueadas')
    .select('data, reserva_id')
    .in('data', dateRange)

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((item) => item.reserva_id !== excludeReservaId)
    .map((item) => item.data)
    .sort()
}

export async function blockReservationDates(
  reservaId: string,
  dateRange: string[]
): Promise<{ conflictDates: string[]; errorMessage?: string }> {
  const conflictDates = await findBlockedDates(dateRange, reservaId)
  if (conflictDates.length > 0) {
    return { conflictDates }
  }

  const { error } = await supabaseAdmin.from('datas_bloqueadas').insert(
    dateRange.map((date) => ({
      data: date,
      motivo: 'reserva_confirmada',
      reserva_id: reservaId,
    }))
  )

  if (!error) {
    return { conflictDates: [] }
  }

  if (error.code === '23505') {
    return {
      conflictDates: await findBlockedDates(dateRange, reservaId),
    }
  }

  return {
    conflictDates: [],
    errorMessage: error.message,
  }
}

export async function unblockReservationDates(reservaId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('datas_bloqueadas')
    .delete()
    .eq('reserva_id', reservaId)

  if (error) {
    throw error
  }
}
