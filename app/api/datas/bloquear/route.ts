import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.cargo !== ADMIN_CARGO) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = await request.json()
    const datas: string[] = body.datas
    const acao: 'bloquear' | 'liberar' = body.acao

    if (!Array.isArray(datas) || datas.length === 0) {
      return NextResponse.json({ ok: true })
    }

    if (acao === 'bloquear') {
      const inserts = datas.map(d => ({
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
        .in('data', datas)
        .eq('motivo', 'bloqueado_admin')
        
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno da API.' }, { status: 500 })
  }
}
