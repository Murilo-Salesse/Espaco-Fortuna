'use client'

import { useEffect, useState } from 'react'

interface Configuracao {
  nome: string
  descricao: string
  localizacao: string
  endereco: string
  numero: string
  ponto_referencia: string
  area_m2: number
  capacidade: number
  quartos: number
  banheiros: number
  comodidades: string[]
  fotos: string[]
}

interface Preco {
  tipo: string
  label: string
  valor: number
}

interface DiaStatus {
  data: string
  motivo: string
}

const PLACEHOLDER_FOTOS = [
  { label: 'Área da piscina',  bg: 'linear-gradient(135deg,#064e3b,#1D9E75)' },
  { label: 'Churrasqueira',    bg: 'linear-gradient(135deg,#7c3f00,#d97706)' },
  { label: 'Área de lazer',    bg: 'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
  { label: 'Sala principal',   bg: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
  { label: 'Quarto principal', bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
  { label: 'Área externa',     bg: 'linear-gradient(135deg,#064e3b,#059669)' },
]

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

function isoParaDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateParaIso(d: Date): string {
  return d.toISOString().split('T')[0]
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const FERIADOS_BR = ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25']

function tipoDia(date: Date, precos: Preco[]): Preco {
  const diaSemana = date.getDay()
  const mesdia = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const isFeriado = FERIADOS_BR.includes(mesdia)
  const isFds = diaSemana === 0 || diaSemana === 6
  const tipo = isFeriado ? 'feriado' : isFds ? 'fds' : 'semana'
  return precos.find(p => p.tipo === tipo) ?? { tipo, label: tipo, valor: 0 }
}

export default function HomePage() {
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [precos, setPrecos] = useState<Preco[]>([])
  const [datasBlockeadas, setDatasBlockeadas] = useState<Set<string>>(new Set())
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const now = new Date()
    return { ano: now.getFullYear(), mes: now.getMonth() }
  })
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i)

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd]     = useState<Date | null>(null)
  const [hoverDay, setHoverDay]     = useState<Date | null>(null)

  const [nome, setNome]         = useState('')
  const [email, setEmail]       = useState('')
  const [telefone, setTelefone] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  const [lbIdx, setLbIdx]       = useState<number | null>(null)
  const [lbVisible, setLbVisible] = useState(false)
  const [carIdx, setCarIdx] = useState(0)

  useEffect(() => {
    fetch('/api/configuracao').then(r => r.json()).then(d => setConfig(d.configuracao))
    fetch('/api/precos').then(r => r.json()).then(d => setPrecos(d.precos ?? []))
  }, [])

  useEffect(() => {
    const mesStr = `${mesSelecionado.ano}-${String(mesSelecionado.mes + 1).padStart(2,'0')}`
    fetch(`/api/datas?mes=${mesStr}`)
      .then(r => r.json())
      .then(d => {
        const set = new Set<string>(d.datas?.map((x: DiaStatus) => x.data) ?? [])
        setDatasBlockeadas(set)
      })
  }, [mesSelecionado])

  const fotosReais: string[] = config?.fotos?.length ? config.fotos.slice(0, 30) : []
  const usandoPlaceholder = fotosReais.length === 0

  type FotoNorm = { url?: string; bg?: string; label: string }
  const fotosNorm: FotoNorm[] = usandoPlaceholder
    ? PLACEHOLDER_FOTOS.map(f => ({ bg: f.bg, label: f.label }))
    : fotosReais.map((url, i) => ({ url, label: `Foto ${i + 1}` }))

  const FOTOS_POR_SLIDE = 4
  const slidesAgrupados: FotoNorm[][] = []
  for (let i = 0; i < fotosNorm.length; i += FOTOS_POR_SLIDE) {
    slidesAgrupados.push(fotosNorm.slice(i, i + FOTOS_POR_SLIDE))
  }
  const totalSlides = slidesAgrupados.length

  function openLightbox(idx: number) {
    setLbIdx(idx)
    requestAnimationFrame(() => requestAnimationFrame(() => setLbVisible(true)))
  }

  function closeLightbox() {
    setLbVisible(false)
    setTimeout(() => setLbIdx(null), 250)
  }

  function lbPrev() {
    setLbIdx(i => ((i! - 1 + fotosNorm.length) % fotosNorm.length))
  }

  function lbNext() {
    setLbIdx(i => (i! + 1) % fotosNorm.length)
  }

  useEffect(() => {
    if (lbIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLbIdx(i => (i === null ? i : (i - 1 + fotosNorm.length) % fotosNorm.length))
      }
      if (e.key === 'ArrowRight') {
        setLbIdx(i => (i === null ? i : (i + 1) % fotosNorm.length))
      }
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lbIdx, fotosNorm.length])

  function carMove(dir: number) {
    setCarIdx(prev => (prev + dir + totalSlides) % totalSlides)
  }

  function goToSlide(i: number) {
    setCarIdx(i)
  }

  function getDiasDoMes() {
    const { ano, mes } = mesSelecionado
    const primeiro = new Date(ano, mes, 1)
    const ultimo   = new Date(ano, mes + 1, 0)
    const offset   = primeiro.getDay()
    const dias: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d))
    return dias
  }

  function mudarMes(dir: number) {
    setMesSelecionado(prev => {
      let mes = prev.mes + dir
      let ano = prev.ano
      if (mes < 0)  { mes = 11; ano-- }
      if (mes > 11) { mes = 0;  ano++ }
      return { ano, mes }
    })
    setRangeStart(null)
    setRangeEnd(null)
  }

  function clickDia(date: Date) {
    const iso = dateParaIso(date)
    if (datasBlockeadas.has(iso)) return
    if (date < isoParaDate(hoje())) return

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date); setRangeEnd(null); return
    }
    if (dateParaIso(date) === dateParaIso(rangeStart)) {
      setRangeStart(null); return
    }

    const s = date < rangeStart ? date : rangeStart
    const e = date < rangeStart ? rangeStart : date
    const d = new Date(s)
    while (d <= e) {
      if (datasBlockeadas.has(dateParaIso(d))) {
        showToast('Há datas bloqueadas nesse período!')
        setRangeStart(date); setRangeEnd(null); return
      }
      d.setDate(d.getDate() + 1)
    }
    setRangeStart(s); setRangeEnd(e)
  }

  function getDiaClasse(date: Date): string {
    const iso         = dateParaIso(date)
    const isPassado   = date < isoParaDate(hoje())
    const isBlockeado = datasBlockeadas.has(iso)
    if (isPassado || isBlockeado) return 'cal-day blocked past'

    const eS = rangeStart && dateParaIso(date) === dateParaIso(rangeStart)
    const eE = rangeEnd   && dateParaIso(date) === dateParaIso(rangeEnd)

    if (rangeEnd) {
      if (eS && eE) return 'cal-day selected'
      if (eS) return 'cal-day range-start'
      if (eE) return 'cal-day range-end'
      if (rangeStart && date > rangeStart && date < rangeEnd!) return 'cal-day in-range'
    } else if (eS) {
      return 'cal-day selected'
    } else if (hoverDay && rangeStart && !rangeEnd) {
      const s = hoverDay < rangeStart ? hoverDay : rangeStart
      const e = hoverDay < rangeStart ? rangeStart : hoverDay
      if (date > s && date < e) return 'cal-day in-range'
    }
    return 'cal-day'
  }

  function getResumo() {
    if (!rangeStart || precos.length === 0) return null
    const fim = rangeEnd ?? rangeStart
    let total = 0
    const tipos = new Set<string>()
    const d = new Date(rangeStart)
    while (d <= fim) {
      const p = tipoDia(d, precos)
      total += p.valor
      tipos.add(p.label)
      d.setDate(d.getDate() + 1)
    }
    const noites  = Math.round((fim.getTime() - rangeStart.getTime()) / 86400000) + 1
    const fmt     = (dt: Date) => `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
    const periodo = dateParaIso(rangeStart) === dateParaIso(fim)
      ? fmt(rangeStart)
      : `${fmt(rangeStart)} → ${fmt(fim)}`
    return { total, noites, tipos: [...tipos].join(' + '), periodo }
  }

  async function handleReservar() {
    if (!nome.trim())  { showToast('Preencha seu nome!');  return }
    if (!rangeStart)   { showToast('Selecione uma data!'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/reservas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:        nome.trim(),
          email:       email.trim() || null,
          telefone:    telefone.trim() || null,
          data_inicio: dateParaIso(rangeStart),
          data_fim:    dateParaIso(rangeEnd ?? rangeStart),
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro ao criar reserva.'); return }
      const popup = window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer')
      if (popup) popup.opener = null
    } catch {
      showToast('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const resumo = getResumo()
  const dias   = getDiasDoMes()

  const totalFotos = fotosNorm.length
  function fotoStyle(f: FotoNorm): React.CSSProperties {
    return f.url
      ? { backgroundImage: `url(${f.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: f.bg ?? '#1c1917' }
  }

  return (
    <div className="font-sans text-stone-800 min-h-screen bg-stone-100">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-lg tracking-tight">
            {config?.nome ?? 'Fortuna'}<span className="text-green-500">.</span>
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-stone-500">
            <a href="#sobre"      className="hover:text-stone-800 transition-colors">O espaço</a>
            <a href="#calendario" className="hover:text-stone-800 transition-colors">Disponibilidade</a>
            <a href="#precos"     className="hover:text-stone-800 transition-colors">Preços</a>
          </nav>
          <a href="#reservar" className="hidden md:inline-flex items-center gap-2 text-sm bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-stone-700 transition-colors">
            Reservar agora
          </a>
        </div>
      </header>

      <main className="pt-14">
        <section className="hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='white'/%3E%3C/svg%3E\")", backgroundSize: '40px 40px' }} />
          <div className="max-w-7xl mx-auto px-8 pt-16 pb-0">
            <div className="max-w-2xl mb-12">
              <span className="inline-block text-green-200 text-xs font-medium tracking-widest uppercase mb-4">
                Locação exclusiva · {config?.localizacao ?? 'Salto, SP'}
              </span>
              <h1 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-5 reveal-l">
                Seu evento,<br />
                <em className="not-italic text-green-400">espaço completo.</em>
              </h1>
              <p className="text-green-100/80 text-base leading-relaxed mb-8 reveal-l" style={{ animationDelay: '0.1s' }}>
                {config?.descricao ?? 'Espaço de lazer privativo com piscina, churrasqueira e muito conforto.'}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a href="#calendario" className="inline-flex items-center gap-2 bg-white text-green-700 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-green-50 transition-colors shadow-sm">
                  Ver datas disponíveis <span className="text-xs">↓</span>
                </a>
                <a href="/modelo-contrato.docx" download className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  Contrato de Exemplo
                </a>
              </div>
            </div>
            {totalSlides > 0 && (
              <div className="relative -mx-8 overflow-hidden" style={{ height: '400px' }}>

                {slidesAgrupados.map((slide, sIdx) => {
                  const [f0, f1, f2, f3] = slide
                  const offset = sIdx - carIdx 
                  return (
                    <div
                      key={sIdx}
                      className="absolute inset-0 px-8 flex gap-3"
                      style={{
                        transform:  `translateX(${offset * 100}%)`,
                        transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    >
                      {f0 && (
                        <div
                          className="rounded-t-2xl overflow-hidden cursor-pointer group relative flex-shrink-0 scale-in"
                          style={{ width: '55%', ...fotoStyle(f0) }}
                          onClick={() => openLightbox(sIdx * FOTOS_POR_SLIDE)}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                            <span className="text-white text-base font-medium">{f0.label}</span>
                            <span className="block text-white/60 text-xs mt-0.5">Clique para ampliar</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 flex-1">
                        {[f1, f2, f3].map((f, i) =>
                          f ? (
                            <div
                              key={i}
                              className="flex-1 rounded-t-2xl overflow-hidden cursor-pointer group relative scale-in"
                              style={{ ...fotoStyle(f), animationDelay: `${(i + 1) * 0.1}s` }}
                              onClick={() => openLightbox(sIdx * FOTOS_POR_SLIDE + i + 1)}
                            >
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                <span className="text-white text-xs font-medium">{f.label}</span>
                              </div>
                            </div>
                          ) : (
                            <div key={i} className="flex-1 rounded-t-2xl bg-white/5" />
                          )
                        )}
                      </div>
                    </div>
                  )
                })}

                {totalSlides > 1 && (
                  <>
                    <button onClick={() => carMove(-1)} className="absolute left-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all text-lg z-10">‹</button>
                    <button onClick={() => carMove(1)}  className="absolute right-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all text-lg z-10">›</button>
                  </>
                )}

                {totalSlides > 1 && (
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {slidesAgrupados.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className="h-1.5 rounded-full bg-white transition-all duration-300"
                        style={{ width: i === carIdx ? '24px' : '6px', opacity: i === carIdx ? 1 : 0.35 }}
                      />
                    ))}
                  </div>
                )}

                {totalSlides > 1 && (
                  <div className="absolute top-4 right-12 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20 z-10">
                    {carIdx + 1} / {totalSlides}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="sobre" className="bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-6 py-14 fade-up">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">O espaço</p>
                <h2 className="font-serif text-3xl text-stone-900 mb-4">{config?.nome ?? 'Espaço Fortuna'}</h2>
                <p className="text-stone-500 leading-relaxed text-sm">{config?.descricao}</p>
                <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-stone-100">
                  {[
                    { val: config?.area_m2,   label: 'm² totais' },
                    { val: config?.quartos,    label: 'quartos'   },
                    { val: config?.banheiros,  label: 'banheiros' },
                    { val: config?.capacidade, label: 'pessoas'   },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-2xl font-light text-stone-900">{item.val ?? '—'}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-4">O que tem</p>
                <div className="flex flex-wrap gap-2">
                  {(config?.comodidades ?? []).map((c, i) => (
                    <span key={c} className="text-xs px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full fade-up" style={{ animationDelay: `${i * 0.05}s` }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="calendario" className="max-w-3xl mx-auto px-4 py-14 fade-up">
          <div className="flex flex-col gap-6">

            <div id="precos">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-4">Valores por diária</p>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <div className="flex flex-col md:grid md:grid-cols-3 divide-y divide-stone-100 md:divide-y-0 md:divide-x">
                  {precos.map(p => (
                    <div key={p.tipo} className="flex md:block items-center justify-between px-6 py-4 md:py-5">
                      <div>
                        <div className="text-xs text-stone-400 mb-0.5">{p.label}</div>
                        <div className="text-xs text-stone-300">{p.tipo === 'semana' ? 'Segunda a Sexta' : p.tipo === 'fds' ? 'Sábado ou Domingo' : 'Nacional'}</div>
                      </div>
                      <div className="text-2xl font-light text-stone-900 md:mt-3">
                        R$ {Number(p.valor).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-4">Escolha as datas</p>
              <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-stone-900 hidden sm:block">
                      {MESES[mesSelecionado.mes]} {mesSelecionado.ano}
                    </h3>
                    <div className="flex gap-1 items-center">
                      <select
                        value={mesSelecionado.mes}
                        onChange={(e) => setMesSelecionado(p => ({ ...p, mes: Number(e.target.value) }))}
                        className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500"
                      >
                        {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select
                        value={mesSelecionado.ano}
                        onChange={(e) => setMesSelecionado(p => ({ ...p, ano: Number(e.target.value) }))}
                        className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500"
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => mudarMes(-1)} className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:border-stone-400 text-sm flex items-center justify-center transition-all">‹</button>
                    <button onClick={() => mudarMes(1)}  className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:border-stone-400 text-sm flex items-center justify-center transition-all">›</button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="text-center text-[11px] font-medium text-stone-400 py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dias.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} />
                    const cls = getDiaClasse(date)
                    return (
                      <div
                        key={dateParaIso(date)}
                        className={`${cls} aspect-square flex items-center justify-center text-sm select-none`}
                        onClick={() => clickDia(date)}
                        onMouseEnter={() => setHoverDay(date)}
                        onMouseLeave={() => setHoverDay(null)}
                      >
                        {date.getDate()}
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-stone-400 mt-4">Clique em uma data para selecionar, ou em duas para escolher um período.</p>
                <div className="flex items-center gap-4 mt-3 pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-xs text-stone-400"><div className="w-3 h-3 rounded-full bg-green-500" />Disponível</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400"><div className="w-3 h-3 rounded-full bg-stone-200" />Reservado</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400"><div className="w-3 h-3 rounded-full bg-amber-400" />Feriado</div>
                </div>
              </div>
            </div>

            {resumo && (
              <div className="fade-up">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-700 tracking-wide uppercase">Resumo da reserva</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="text-xs text-stone-400 mb-1">Período</div><div className="font-medium text-stone-800 text-sm">{resumo.periodo}</div></div>
                    <div><div className="text-xs text-stone-400 mb-1">Diárias</div><div className="font-medium text-stone-800">{resumo.noites} {resumo.noites === 1 ? 'diária' : 'diárias'}</div></div>
                    <div><div className="text-xs text-stone-400 mb-1">Tipo</div><div className="font-medium text-stone-800 text-xs">{resumo.tipos}</div></div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-200">
                    <span className="text-sm text-green-700 font-medium">Total estimado</span>
                    <span className="text-2xl font-light text-green-700">R$ {resumo.total.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        <section id="reservar" className="bg-white border-t border-stone-200 fade-up">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <div className="max-w-lg">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">Reservar</p>
              <h2 className="font-serif text-3xl text-stone-900 mb-2">Seus dados</h2>
              <p className="text-stone-400 text-sm mb-4">Preencha e clique em confirmar. O resumo vai direto para o WhatsApp.</p>

              <div className="mb-8">
                <a href="/modelo-contrato.docx" download className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors bg-stone-50 hover:bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                  Ver contrato de exemplo
                </a>
              </div>

              <div className="space-y-4">
                {[
                  { label:'Nome completo', type:'text',  value:nome,     onChange:setNome,     placeholder:'João Silva'      },
                  { label:'E-mail',        type:'email', value:email,    onChange:setEmail,    placeholder:'joao@email.com'  },
                  { label:'WhatsApp',      type:'tel',   value:telefone, onChange:setTelefone, placeholder:'(11) 99999-0000' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl text-stone-800 placeholder-stone-300 transition-colors focus:outline-none focus:border-green-500"
                    />
                  </div>
                ))}
              </div>

              {resumo && (
                <div className="mt-6 p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-2">
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Período</span>
                    <span className="text-stone-800 font-medium">{resumo.periodo}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Total</span>
                    <span className="text-green-600 font-medium">R$ {resumo.total.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleReservar}
                disabled={enviando}
                className="wpp-btn mt-6 w-full flex items-center justify-center gap-3 text-white text-sm font-medium py-3.5 rounded-xl disabled:opacity-60"
              >
                {enviando ? (
                  <svg className="spinner w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                )}
                {enviando ? 'Aguarde...' : 'Confirmar e enviar no WhatsApp'}
              </button>
              <p className="text-center text-xs text-stone-300 mt-3">Você será redirecionado para o WhatsApp com o resumo pronto.</p>
            </div>
          </div>
        </section>
        <section id="localizacao" className="bg-stone-50 fade-up">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">Localização</p>
                <h2 className="font-serif text-3xl text-stone-900 mb-4">Como chegar</h2>
                <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                  Localizado em uma área tranquila de Birigui, o {config?.nome ?? 'Espaço Fortuna'} oferece o equilíbrio perfeito entre fácil acesso e total privacidade.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center flex-none mt-0.5">
                      <svg width="14" height="14" fill="none" stroke="#78716c" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Endereço</div>
                      <div className="text-sm text-stone-700 font-medium">{config?.endereco ? `${config.endereco}${config.numero ? ', ' + config.numero : ''}` : 'Rua Anézio Caretta, 284, Parque das Arvores II, Birigui - SP'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center flex-none mt-0.5">
                      <svg width="14" height="14" fill="none" stroke="#78716c" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Ponto de referência</div>
                      <div className="text-sm text-stone-700 font-medium">{config?.ponto_referencia || 'Bairro Itapuã · Próximo ao centro'}</div>
                    </div>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(config?.endereco ? `${config.endereco}${config.numero ? ', ' + config.numero : ''}` : 'R. Anézio Caretta, 284, Birigui - SP')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-8 text-xs font-bold uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors"
                >
                  Abrir no Google Maps 
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
              </div>
              <div className="flex-1 w-full aspect-square md:aspect-auto md:h-[400px] rounded-3xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
                <iframe 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  loading="lazy" 
                  allowFullScreen 
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(config?.endereco ? `${config.endereco}${config.numero ? ', ' + config.numero : ''}, ${config.localizacao || ''}` : 'R. Anézio Caretta, 284, Birigui - SP')}&output=embed`}
                />
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-stone-900 text-stone-400">

          <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-serif text-white text-lg">{config?.nome ?? 'Fortuna'}<span className="text-green-400">.</span></span>
            <p className="text-xs">{config?.localizacao} · Locação exclusiva · © {new Date().getFullYear()}</p>
          </div>
        </footer>
      </main>

      {lbIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: lbVisible ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0)',
            backdropFilter:   lbVisible ? 'blur(8px)' : 'blur(0px)',
            transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeLightbox() }}
        >
          <button onClick={closeLightbox} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center text-xl hover:bg-white/20 transition-all z-10">×</button>

          {totalFotos > 1 && (
            <button onClick={lbPrev} className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-all z-10">‹</button>
          )}

          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center"
            style={{
              width:     '80vw',
              maxWidth:  '900px',
              height:    '70vh',
              opacity:   lbVisible ? 1 : 0,
              transform: lbVisible ? 'scale(1)' : 'scale(0.95)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
              ...fotoStyle(fotosNorm[lbIdx] ?? fotosNorm[0]),
            }}
          >
            {!fotosNorm[lbIdx]?.url && (
              <div className="text-center">
                <div className="text-white/70 text-base font-medium">{fotosNorm[lbIdx]?.label}</div>
                <div className="text-white/30 text-xs mt-1">Foto {lbIdx + 1} de {totalFotos}</div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
              <span className="text-white text-sm font-medium">
                {fotosNorm[lbIdx]?.label ?? `Foto ${lbIdx + 1}`}
              </span>
            </div>
          </div>

          {totalFotos > 1 && (
            <button onClick={lbNext} className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-all z-10">›</button>
          )}

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs bg-black/30 px-3 py-1 rounded-full">
            {lbIdx + 1} / {totalFotos}
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-5 py-3 rounded-full z-50 fade-up">
          {toast}
        </div>
      )}
    </div>
  )
}
