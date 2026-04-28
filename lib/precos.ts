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

export function getPrecoTipo(monthIndex: number, dayOfWeek: number): PrecoTipo {
  if (monthIndex === 0) return 'janeiro'
  if (monthIndex === 11) return 'dezembro'
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) return 'fds'

  return 'semana'
}
