

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const mes = request.nextUrl.searchParams.get('mes')

  const inicio = mes
    ? `${mes}-01`
    : new Date().toISOString().slice(0, 7) + '-01'

  const fimDate = new Date(inicio)
  fimDate.setMonth(fimDate.getMonth() + 1)
  fimDate.setDate(fimDate.getDate() - 1)
  const fim = fimDate.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('datas_bloqueadas')
    .select('data, motivo')
    .gte('data', inicio)
    .lte('data', fim)

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar datas.' }, { status: 500 })
  }

  return NextResponse.json({ datas: data ?? [] })
}

