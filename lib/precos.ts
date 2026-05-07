export const PRECO_CONFIGS = [
  {
    tipo: 'semana',
    label: 'Dias da semana',
    descricao: 'Segunda, Terça, Quarta e Quinta',
    fallback: 350,
  },
  {
    tipo: 'fds',
    label: 'Fim de semana',
    descricao: 'Sexta, Sábado e Domingo',
    fallback: 600,
  },
  {
    tipo: 'feriado',
    label: 'Feriados',
    descricao: 'Feriados oficiais',
    fallback: 800,
  },
  {
    tipo: 'dezembro',
    label: 'Dezembro',
    descricao: 'Mês de dezembro',
    fallback: 800,
  },
  {
    tipo: 'janeiro',
    label: 'Janeiro',
    descricao: 'Mês de janeiro',
    fallback: 800,
  },
] as const

export type PrecoTipo = (typeof PRECO_CONFIGS)[number]['tipo']
export type Preco = { tipo: PrecoTipo; label: string; valor: number }

export const PRECO_TIPOS = new Set<string>(PRECO_CONFIGS.map((preco) => preco.tipo))
export const FERIADOS_BR = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']

function formatMonthDay(monthIndex: number, dayOfMonth: number): string {
  return `${String(monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(Date.UTC(year, month - 1, day))
}

export function getFeriadosBR(year: number): string[] {
  const easter = getEasterSunday(year)
  const moveis = [addDays(easter, -48), addDays(easter, -47), addDays(easter, -2), addDays(easter, 60)]

  return [
    ...FERIADOS_BR,
    ...moveis.map((date) => formatMonthDay(date.getUTCMonth(), date.getUTCDate())),
  ]
}

export function isFeriadoBR(year: number, monthIndex: number, dayOfMonth: number): boolean {
  return getFeriadosBR(year).includes(formatMonthDay(monthIndex, dayOfMonth))
}

export function getPrecoConfig(tipo: string) {
  return PRECO_CONFIGS.find((preco) => preco.tipo === tipo)
}

export function mergePrecos(
  precos: Array<{ tipo: string; label?: string | null; valor: number | string | null }>
): Preco[] {
  const precoMap = new Map(precos.map((preco) => [preco.tipo, preco]))

  return PRECO_CONFIGS.map((config) => {
    const preco = precoMap.get(config.tipo)
    return {
      tipo: config.tipo,
      label: preco?.label || config.label,
      valor: Number(preco?.valor ?? config.fallback),
    }
  })
}

export function getPrecoTipo(monthIndex: number, dayOfWeek: number, dayOfMonth?: number, year?: number): PrecoTipo {
  if (dayOfMonth) {
    const isFeriado = year
      ? isFeriadoBR(year, monthIndex, dayOfMonth)
      : FERIADOS_BR.includes(formatMonthDay(monthIndex, dayOfMonth))

    if (isFeriado) return 'feriado'
  }

  if (monthIndex === 0) return 'janeiro'
  if (monthIndex === 11) return 'dezembro'
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) return 'fds'

  return 'semana'
}
