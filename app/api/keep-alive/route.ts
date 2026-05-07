import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { error } = await supabase
      .from('configuracao')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Erro no keep-alive:', error.message)
      return NextResponse.json({ status: 'error' }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', message: 'Supabase is alive!' }, { status: 200 })
  } catch (error) {
    console.error('Erro catastrófico no keep-alive:', error instanceof Error ? error.message : error)
    return NextResponse.json({ status: 'error', message: 'Unknown error' }, { status: 500 })
  }
}
