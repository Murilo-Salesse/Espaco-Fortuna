'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { sanitizeInternalRedirect } from '@/lib/security'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = sanitizeInternalRedirect(searchParams.get('redirect'))

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error ?? 'Credenciais inválidas.')
        return
      }

      window.location.assign(redirect)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="font-sans min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-200 h-14 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-fortuna.jpg" alt="Espaco Fortuna" width={40} height={40} className="h-9 w-9 rounded-md object-cover" priority />
          <span className="font-serif text-lg">
            Fortuna<span className="text-green-500">.</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" fill="none" stroke="#78716c" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-1">Entrar na sua conta</h1>
            <p className="text-sm text-stone-400">Acesso ao painel administrativo.</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {erro && (
              <p className="text-xs text-red-500 pt-1">{erro}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="spinner w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-4">
            <Link href="/" className="hover:text-stone-600 transition-colors">← Voltar para o site</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
