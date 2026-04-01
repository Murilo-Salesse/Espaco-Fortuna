

import { NextResponse } from 'next/server'
import { clearCookieOptions } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearCookieOptions())
  response.headers.set('Cache-Control', 'no-store')
  return response
}
