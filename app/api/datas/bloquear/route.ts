import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { parseIsoDate } from '@/lib/reservas'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.cargo !== ADMIN_CARGO) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = await request.json()
    const datas = Array.isArray(body.datas) ? [...new Set(body.datas)] : []
    const acao: 'bloquear' | 'liberar' = body.acao

    if (!Array.isArray(datas) || datas.length === 0) {
      return NextResponse.json({ ok: true })
    }

    if (datas.length > 90 || (acao !== 'bloquear' && acao !== 'liberar')) {
      return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 })
    }

    const datasValidas = datas.filter(
      (data): data is string => typeof data === 'string' && Boolean(parseIsoDate(data))
    )

    if (datasValidas.length !== datas.length) {
      return NextResponse.json({ error: 'Uma ou mais datas são inválidas.' }, { status: 400 })
    }

    if (acao === 'bloquear') {
      const inserts = datasValidas.map(d => ({
        data: d,
        motivo: 'bloqueado_admin'
      }))
      
      const { error } = await supabaseAdmin
        .from('datas_bloqueadas')
        .upsert(inserts, { onConflict: 'data' })
        
      if (error) throw error
      
    } else if (acao === 'liberar') {
      const { error } = await supabaseAdmin
        .from('datas_bloqueadas')
        .delete()
        .in('data', datasValidas)
        .eq('motivo', 'bloqueado_admin')
        
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno da API.' }, { status: 500 })
  }
}
