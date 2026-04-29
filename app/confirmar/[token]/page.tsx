'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ADMIN_CARGO } from '@/lib/constants'

type Estado = 'loading' | 'negado' | 'reserva' | 'sucesso' | 'recusado' | 'erro'

interface Reserva {
  token: string
  nome: string
  email: string
  telefone: string
  data_inicio: string
  data_fim: string
  valor_total: number
  status: string
}

interface Session { nome: string; cargo: number }

function fmt(iso: string) {
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function periodo(inicio: string, fim: string) {
  return inicio === fim ? fmt(inicio) : `${fmt(inicio)} → ${fmt(fim)}`
}

function diffDias(inicio: string, fim: string) {
  const a = new Date(inicio), b = new Date(fim)
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

export default function ConfirmarPage() {
  const { token }    = useParams<{ token: string }>()
  const router       = useRouter()

  const [estado, setEstado]   = useState<Estado>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [erroInfo, setErroInfo] = useState({ titulo: 'Link inválido', msg: 'Este link não existe ou já foi utilizado.' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      const user: Session | null = meData.usuario ?? null
      setSession(user)

      if (!user) {
        router.push(`/login?redirect=/confirmar/${token}`)
        return
      }

      if (user.cargo !== ADMIN_CARGO) {
        setEstado('negado')
        return
      }

      const rRes = await fetch(`/api/reservas/${token}`)
      const rData = await rRes.json()

      if (!rRes.ok || !rData.reserva) {
        setEstado('erro')
        return
      }

      const res: Reserva = rData.reserva

      if (res.status === 'confirmada') {
        setErroInfo({ titulo: 'Reserva já confirmada', msg: `A reserva de ${res.nome} já foi confirmada.` })
        setEstado('erro')
        return
      }

      if (res.status === 'cancelada') {
        setErroInfo({ titulo: 'Reserva recusada', msg: 'Esta reserva já foi recusada anteriormente.' })
        setEstado('erro')
        return
      }

      setReserva(res)
      setEstado('reserva')
    }

    init()
  }, [token, router])

  async function confirmar() {
    if (!reserva) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reservas/${token}/confirmar`, {
        method:  'POST',
      })
      if (res.ok) {
        setEstado('sucesso')
      } else {
        const d = await res.json()
        setErroInfo({ titulo: 'Erro ao confirmar', msg: d.error ?? 'Tente novamente.' })
        setEstado('erro')
      }
    } finally {
      setLoading(false)
    }
  }

  async function recusar() {
    if (!reserva) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reservas/${token}/cancelar`, { method: 'POST' })
      if (res.ok) {
        setEstado('recusado')
      } else {
        const data = await res.json()
        setErroInfo({ titulo: 'Erro ao recusar', msg: data.error ?? 'Tente novamente.' })
        setEstado('erro')
      }
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/login?redirect=/confirmar/${token}`)
  }

  return (
    <div className="font-sans bg-stone-50 min-h-screen flex flex-col">

      {}
      <header className="bg-white border-b border-stone-200 h-14 flex items-center justify-between px-6">
        <Link href="/" className="font-serif text-lg">Fortuna<span className="text-green-500">.</span></Link>
        {session && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center">
              {session.nome.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-stone-500 hidden sm:inline">{session.nome}</span>
            <button onClick={logout} className="text-xs text-stone-400 hover:text-red-500 transition-colors ml-1">Sair</button>
          </div>
        )}
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {}
          {estado === 'loading' && (
            <div className="flex flex-col items-center py-20 gap-4">
              <svg className="spinner w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              <p className="text-sm text-stone-400">Verificando...</p>
            </div>
          )}

          {}
          {estado === 'negado' && (
            <div className="fade-up text-center py-10">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg width="26" height="26" fill="none" stroke="#dc2626" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-stone-900 mb-2">Acesso negado</h1>
              <p className="text-sm text-stone-400 mb-2">Sua conta não tem permissão para confirmar reservas.</p>
              <p className="text-xs text-stone-300 mb-8">
                Esta ação é restrita ao <span className="bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded font-mono">Administrador</span>.
              </p>
              <button onClick={logout} className="text-sm text-stone-500 hover:text-stone-700 border border-stone-200 px-4 py-2 rounded-xl transition-colors">
                Entrar com outra conta
              </button>
            </div>
          )}

          {}
          {estado === 'reserva' && reserva && (
            <div className="fade-up">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" fill="none" stroke="#60462f" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </div>
                <h1 className="font-serif text-2xl text-stone-900 mb-1">Confirmar reserva</h1>
                <p className="text-sm text-stone-400">Revise os dados e confirme para bloquear as datas.</p>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Detalhes</span>
                  <code className="text-[11px] bg-stone-100 text-stone-400 px-2 py-0.5 rounded">{token}</code>
                </div>
                <div className="divide-y divide-stone-100">
                  {[
                    ['Cliente',   reserva.nome],
                    ['WhatsApp',  reserva.telefone],
                    ['E-mail',    reserva.email],
                    ['Período',   periodo(reserva.data_inicio, reserva.data_fim)],
                    ['Diárias',   `${diffDias(reserva.data_inicio, reserva.data_fim)} ${diffDias(reserva.data_inicio, reserva.data_fim) === 1 ? 'diária' : 'diárias'}`],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-stone-400">{l}</span>
                      <span className="font-medium text-stone-800">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-5 py-4 text-sm bg-stone-50">
                    <span className="font-medium text-stone-600">Total</span>
                    <span className="text-lg font-light text-green-600">R$ {Number(reserva.valor_total).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
                <svg className="flex-none mt-0.5" width="14" height="14" fill="none" stroke="#92400e" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Ao confirmar, as datas serão <strong>bloqueadas automaticamente</strong> no calendário. Esta ação não pode ser desfeita por aqui.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={recusar}
                  disabled={loading}
                  className="flex-1 text-sm border border-stone-200 py-3 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors disabled:opacity-60"
                >
                  Recusar
                </button>
                <button
                  onClick={confirmar}
                  disabled={loading}
                  className="flex-1 text-sm bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <svg className="spinner w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  ) : (
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  Confirmar e bloquear
                </button>
              </div>
            </div>
          )}

          {}
          {estado === 'sucesso' && reserva && (
            <div className="text-center py-10 scale-in">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" fill="none" stroke="#60462f" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-stone-900 mb-2">Reserva confirmada!</h1>
              <p className="text-sm text-stone-400 mb-8">Datas bloqueadas automaticamente no calendário.</p>
              <div className="bg-white border border-stone-200 rounded-2xl p-5 text-left mb-6 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-stone-400">Cliente</span><span className="font-medium text-stone-800">{reserva.nome}</span></div>
                <div className="flex justify-between text-sm"><span className="text-stone-400">Período</span><span className="font-medium text-stone-800">{periodo(reserva.data_inicio, reserva.data_fim)}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t border-stone-100 mt-1">
                  <span className="font-medium text-stone-500">Total</span>
                  <span className="font-medium text-green-600">R$ {Number(reserva.valor_total).toLocaleString('pt-BR')}</span>
                </div>
              </div>
              <a href="/admin" className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Ir para o painel
              </a>
            </div>
          )}

          {}
          {estado === 'recusado' && (
            <div className="fade-up text-center py-10">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-stone-900 mb-2">Reserva recusada</h1>
              <p className="text-sm text-stone-400 mb-6">As datas continuam disponíveis no calendário.</p>
              <a href="/admin" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Ir para o painel
              </a>
            </div>
          )}

          {}
          {estado === 'erro' && (
            <div className="fade-up text-center py-10">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" fill="none" stroke="#a8a29e" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-stone-900 mb-2">{erroInfo.titulo}</h1>
              <p className="text-sm text-stone-400 mb-6">{erroInfo.msg}</p>
              <a href="/admin" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Ir para o painel
              </a>
            </div>
          )}

        </div>
      </main>

      <footer className="py-5 text-center text-xs text-stone-300">
        Espaço Fortuna · Acesso restrito
      </footer>
    </div>
  )
}
