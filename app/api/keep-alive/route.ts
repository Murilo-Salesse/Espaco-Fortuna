import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Faz uma query muito simples no banco de dados para marcar atividade
    // Pegar apenas 1 registro de qualquer tabela que não afete performance
    const { error } = await supabase
      .from('configuracao')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Erro no keep-alive:', error.message)
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', message: 'Supabase is alive!' }, { status: 200 })
  } catch (error: any) {
    console.error('Erro catastrófico no keep-alive:', error.message)
    return NextResponse.json({ status: 'error', message: 'Unknown error' }, { status: 500 })
  }
}
