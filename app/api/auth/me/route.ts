

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ usuario: null })
  return NextResponse.json({
    usuario: {
      id:    session.id,
      nome:  session.nome,
      email: session.email,
      cargo: session.cargo,
    }
  })
}
