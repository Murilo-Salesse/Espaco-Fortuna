'use client'

import { useEffect, useRef, useState } from 'react'

interface Configuracao {
  nome: string
  descricao: string
  localizacao: string
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

interface SlidePhoto {
  label: string
  bg: string
}

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

const TODAS_FOTOS: SlidePhoto[] = [
  { label: 'Área da piscina',    bg: 'linear-gradient(135deg,#064e3b,#1D9E75)' },
  { label: 'Churrasqueira',      bg: 'linear-gradient(135deg,#7c3f00,#d97706)' },
  { label: 'Área de lazer',      bg: 'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
  { label: 'Sala principal',     bg: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
  { label: 'Quarto principal',   bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
  { label: 'Área externa',       bg: 'linear-gradient(135deg,#064e3b,#059669)' },
  { label: 'Cozinha',            bg: 'linear-gradient(135deg,#1c1917,#78716c)' },
  { label: 'Sala de jantar',     bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
  { label: 'Banheiro suite',     bg: 'linear-gradient(135deg,#4a044e,#c026d3)' },
  { label: 'Varanda',            bg: 'linear-gradient(135deg,#365314,#84cc16)' },
  { label: 'Área kids',          bg: 'linear-gradient(135deg,#7c2d12,#fb923c)' },
  { label: 'Piscina noturna',    bg: 'linear-gradient(135deg,#0f172a,#334155)' },
  { label: 'Jardim',             bg: 'linear-gradient(135deg,#14532d,#4ade80)' },
  { label: 'Quarto 2',           bg: 'linear-gradient(135deg,#450a0a,#ef4444)' },
  { label: 'Sala de jogos',      bg: 'linear-gradient(135deg,#1e1b4b,#6366f1)' },
  { label: 'Espaço gourmet',     bg: 'linear-gradient(135deg,#451a03,#f59e0b)' },
  { label: 'Academia',           bg: 'linear-gradient(135deg,#0f172a,#475569)' },
  { label: 'Entrada',            bg: 'linear-gradient(135deg,#042f2e,#2dd4bf)' },
  { label: 'Terraço',            bg: 'linear-gradient(135deg,#3b0764,#a855f7)' },
  { label: 'Área gourmet',       bg: 'linear-gradient(135deg,#7c3f00,#b45309)' },
  { label: 'Deck',               bg: 'linear-gradient(135deg,#052e16,#22c55e)' },
  { label: 'Garagem',            bg: 'linear-gradient(135deg,#111827,#374151)' },
  { label: 'Corredor',           bg: 'linear-gradient(135deg,#1e3a5f,#60a5fa)' },
  { label: 'Quarto 3',           bg: 'linear-gradient(135deg,#500724,#f43f5e)' },
  { label: 'Sauna',              bg: 'linear-gradient(135deg,#431407,#ea580c)' },
  { label: 'Banheiro externo',   bg: 'linear-gradient(135deg,#0c4a6e,#38bdf8)' },
  { label: 'Área de serviço',    bg: 'linear-gradient(135deg,#1c1917,#a8a29e)' },
  { label: 'Vista frontal',      bg: 'linear-gradient(135deg,#065f46,#34d399)' },
  { label: 'Pôr do sol',         bg: 'linear-gradient(135deg,#7c2d12,#f97316)' },
  { label: 'Noite iluminada',    bg: 'linear-gradient(135deg,#020617,#1e40af)' },
]

function agruparEmSlides(fotos: SlidePhoto[]): SlidePhoto[][] {
  const slides: SlidePhoto[][] = []
  for (let i = 0; i < fotos.length; i += 3) {
    slides.push(fotos.slice(i, i + 3))
  }
  return slides
}

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

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd]     = useState<Date | null>(null)
  const [hoverDay, setHoverDay]     = useState<Date | null>(null)

  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [telefone, setTelefone] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  const [lbIdx, setLbIdx] = useState<number | null>(null)
  const [lbVisible, setLbVisible] = useState(false)

  const [carIdx, setCarIdx] = useState(0)
  const slides = agruparEmSlides(TODAS_FOTOS)
  const totalSlides = slides.length
  const carouselRef = useRef<HTMLDivElement>(null)

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

  function openLightbox(idx: number) {
    setLbIdx(idx)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLbVisible(true))
    })
  }

  function closeLightbox() {
    setLbVisible(false)
    setTimeout(() => setLbIdx(null), 250)
  }

  function lbPrev() {
    setLbIdx(i => ((i! - 1 + TODAS_FOTOS.length) % TODAS_FOTOS.length))
  }

  function lbNext() {
    setLbIdx(i => (i! + 1) % TODAS_FOTOS.length)
  }

  useEffect(() => {
    if (lbIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  lbPrev()
      if (e.key === 'ArrowRight') lbNext()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lbIdx])

  function carMove(dir: number) {
    const next = (carIdx + dir + totalSlides) % totalSlides
    setCarIdx(next)
    if (carouselRef.current) {
      carouselRef.current.style.transform = `translateX(-${next * 100}%)`
    }
  }

  function getDiasDoMes() {
    const { ano, mes } = mesSelecionado
    const primeiro = new Date(ano, mes, 1)
    const ultimo   = new Date(ano, mes + 1, 0)
    const offset   = primeiro.getDay()
    const dias: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= ultimo.getDate(); d++) {
      dias.push(new Date(ano, mes, d))
    }
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
      setRangeStart(date)
      setRangeEnd(null)
      return
    }

    if (dateParaIso(date) === dateParaIso(rangeStart)) {
      setRangeStart(null)
      return
    }

    const s = date < rangeStart ? date : rangeStart
    const e = date < rangeStart ? rangeStart : date

    const d = new Date(s)
    while (d <= e) {
      if (datasBlockeadas.has(dateParaIso(d))) {
        showToast('Há datas bloqueadas nesse período!')
        setRangeStart(date)
        setRangeEnd(null)
        return
      }
      d.setDate(d.getDate() + 1)
    }

    setRangeStart(s)
    setRangeEnd(e)
  }

  function getDiaClasse(date: Date): string {
    const iso = dateParaIso(date)
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
    const noites = Math.round((fim.getTime() - rangeStart.getTime()) / 86400000) + 1
    const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
    const periodo = rangeStart === fim || dateParaIso(rangeStart) === dateParaIso(fim)
      ? fmt(rangeStart)
      : `${fmt(rangeStart)} → ${fmt(fim)}`
    return { total, noites, tipos: [...tipos].join(' + '), periodo }
  }

  async function handleReservar() {
    if (!nome.trim())  { showToast('Preencha seu nome!'); return }
    if (!rangeStart)   { showToast('Selecione uma data!'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:        nome.trim(),
          email:       email.trim() || null,
          telefone:    telefone.trim() || null,
          data_inicio: dateParaIso(rangeStart),
          data_fim:    dateParaIso(rangeEnd ?? rangeStart),
        }),
      })

      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro ao criar reserva.'); return }

      window.open(data.whatsapp_url, '_blank')

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
          <div className="max-w-5xl mx-auto px-6 pt-16 pb-0">
            <div className="max-w-xl mb-10">
              <span className="inline-block text-green-200 text-xs font-medium tracking-widest uppercase mb-4">
                Locação exclusiva · {config?.localizacao ?? 'Salto, SP'}
              </span>
              <h1 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-4">
                Seu evento,<br />
                <em className="not-italic text-green-400">espaço completo.</em>
              </h1>
              <p className="text-green-100/80 text-base leading-relaxed mb-8">
                {config?.descricao ?? 'Espaço de lazer privativo com piscina, churrasqueira e muito conforto.'}
              </p>
              <a href="#calendario" className="inline-flex items-center gap-2 bg-white text-green-700 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-green-50 transition-colors">
                Ver datas disponíveis <span className="text-xs">↓</span>
              </a>
            </div>

            <div className="relative -mx-6 overflow-hidden">
              <div
                className="carousel-track"
                ref={carouselRef}
                style={{ display: 'flex', width: `${totalSlides * 100}%`, transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}
              >
                {slides.map((slide, slideIdx) => {
                  const baseIdx = slideIdx * 3
                  const [foto0, foto1, foto2] = slide

                  return (
                    <div
                      key={slideIdx}
                      className="px-6"
                      style={{ width: `${100 / totalSlides}%`, flexShrink: 0 }}
                    >
                      <div className="grid grid-cols-12 gap-3 h-80">

                        <div
                          className="col-span-7 rounded-t-2xl overflow-hidden cursor-pointer group relative"
                          onClick={() => openLightbox(baseIdx)}
                          style={{ background: foto0?.bg ?? '#064e3b' }}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                            </div>
                          </div>
                          {foto0 && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                              <span className="text-white text-sm font-medium">{foto0.label}</span>
                              <span className="block text-white/60 text-xs mt-0.5">Clique para ampliar</span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-5 flex flex-col gap-3">
                          {[foto1, foto2].map((foto, i) => foto ? (
                            <div
                              key={foto.label}
                              className="flex-1 overflow-hidden cursor-pointer group relative rounded-t-2xl"
                              onClick={() => openLightbox(baseIdx + i + 1)}
                              style={{ background: foto.bg }}
                            >
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                <span className="text-white text-xs font-medium">{foto.label}</span>
                              </div>
                            </div>
                          ) : (
                            <div key={i} className="flex-1 rounded-t-2xl bg-white/5" />
                          ))}
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>

              <button onClick={() => carMove(-1)} className="absolute left-8 top-1/2 -translate-y-6 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all text-sm z-10">‹</button>
              <button onClick={() => carMove(1)}  className="absolute right-8 top-1/2 -translate-y-6 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all text-sm z-10">›</button>

              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 flex-wrap justify-center max-w-xs">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCarIdx(i)
                      if (carouselRef.current) {
                        carouselRef.current.style.transform = `translateX(-${i * 100}%)`
                      }
                    }}
                    className="h-1.5 rounded-full bg-white transition-all duration-300"
                    style={{ width: i === carIdx ? '20px' : '6px', opacity: i === carIdx ? 1 : 0.4 }}
                  />
                ))}
              </div>

              <div className="absolute top-4 right-10 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20 z-10">
                {carIdx + 1} / {totalSlides}
              </div>
            </div>
          </div>
        </section>

        <section id="sobre" className="bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-6 py-14">
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
                  {(config?.comodidades ?? []).map(c => (
                    <span key={c} className="text-xs px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="calendario" className="max-w-3xl mx-auto px-4 py-14">
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
                  <h3 className="text-base font-medium text-stone-900">
                    {MESES[mesSelecionado.mes]} {mesSelecionado.ano}
                  </h3>
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

        <section id="reservar" className="bg-white border-t border-stone-200">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <div className="max-w-lg">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">Reservar</p>
              <h2 className="font-serif text-3xl text-stone-900 mb-2">Seus dados</h2>
              <p className="text-stone-400 text-sm mb-8">Preencha e clique em confirmar. O resumo vai direto para o WhatsApp.</p>

              <div className="space-y-4">
                {[
                  { label:'Nome completo', type:'text',  value:nome,     onChange:setNome,     placeholder:'João Silva'       },
                  { label:'E-mail',        type:'email', value:email,    onChange:setEmail,    placeholder:'joao@email.com'   },
                  { label:'WhatsApp',      type:'tel',   value:telefone, onChange:setTelefone, placeholder:'(11) 99999-0000'  },
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
            backdropFilter: lbVisible ? 'blur(8px)' : 'blur(0px)',
            transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeLightbox() }}
        >

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center text-xl hover:bg-white/20 transition-all z-10"
            aria-label="Fechar"
          >
            ×
          </button>

          <button
            onClick={lbPrev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-all z-10"
            aria-label="Foto anterior"
          >‹</button>

          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center text-white/40 text-sm"
            style={{
              width: '80vw',
              maxWidth: '900px',
              height: '70vh',
              background: TODAS_FOTOS[lbIdx]?.bg ?? '#064e3b',
              opacity: lbVisible ? 1 : 0,
              transform: lbVisible ? 'scale(1)' : 'scale(0.95)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >

            <div className="text-center">
              <div className="text-white/70 text-base font-medium">{TODAS_FOTOS[lbIdx]?.label}</div>
              <div className="text-white/30 text-xs mt-1">Foto {lbIdx + 1} de {TODAS_FOTOS.length}</div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
              <span className="text-white text-sm font-medium">{TODAS_FOTOS[lbIdx]?.label}</span>
            </div>
          </div>

          <button
            onClick={lbNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-all z-10"
            aria-label="Próxima foto"
          >›</button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs bg-black/30 px-3 py-1 rounded-full">
            {lbIdx + 1} / {TODAS_FOTOS.length}
          </div>

          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2 z-10 overflow-x-auto max-w-sm md:max-w-2xl px-2 pb-1">
            {TODAS_FOTOS.map((foto, i) => (
              <button
                key={i}
                onClick={() => setLbIdx(i)}
                className="flex-shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  background: foto.bg,
                  borderColor: i === lbIdx ? 'white' : 'transparent',
                  opacity: i === lbIdx ? 1 : 0.5,
                }}
                aria-label={foto.label}
              />
            ))}
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