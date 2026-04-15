'use client'

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Tab = 'dashboard' | 'reservas' | 'calendario' | 'fotos' | 'precos' | 'detalhes'

interface Reserva {
  id: string; token: string; nome: string; email: string; telefone: string
  data_inicio: string; data_fim: string; valor_total: number
  status: 'pendente' | 'confirmada' | 'cancelada'
  contrato?: string;
  contrato_assinado?: boolean;
  valor_pago?: number;
  saldo?: number;
  pgto_detalhes?: string;
}
interface Preco { tipo: string; label: string; valor: number }
interface Configuracao {
  nome: string; descricao: string; localizacao: string
  endereco: string; numero: string; ponto_referencia: string; whatsapp_admin: string
  area_m2: number; capacidade: number; quartos: number
  banheiros: number; vagas: number; comodidades: string[]; fotos: string[]
}
interface DiaInfo { data: string; motivo: string }

const MESES       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const FERIADOS_BR = ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25']
const RESERVA_STATUS_OPTIONS: Reserva['status'][] = ['pendente', 'confirmada', 'cancelada']
const NOVA_RESERVA_STATUS_OPTIONS: Array<Extract<Reserva['status'], 'pendente' | 'confirmada'>> = ['pendente', 'confirmada']

function isFeriado(d: Date) {
  const mesdia = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return FERIADOS_BR.includes(mesdia)
}
function fmt(iso: string) {
  const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const IconGrid      = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IconCal       = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
const IconPhoto     = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
const IconMoney     = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const IconEdit      = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconHamburger = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
const IconCheck     = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
const IconPlus      = () => <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconLink      = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
const IconTrash     = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab]                 = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toast, setToast]             = useState<string | null>(null)
  const [session, setSession]         = useState<{ nome: string; cargo: number } | null>(null)

  const [reservas, setReservas]   = useState<Reserva[]>([])
  const [precos, setPrecos]       = useState<Preco[]>([])
  const [config, setConfig]       = useState<Configuracao | null>(null)
  const [datasInfo, setDatasInfo] = useState<DiaInfo[]>([])

  const [calMes, setCalMes] = useState(() => { const n = new Date(); return { ano: n.getFullYear(), mes: n.getMonth() } })
  const [pendentes, setPendentes] = useState<Map<string, 'bloquear' | 'liberar'>>(new Map())

  const [confirmModal, setConfirmModal] = useState<Reserva | null>(null)
  const [editModal, setEditModal]       = useState<Reserva | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [comodModal, setComodModal]     = useState(false)
  const [novoModal, setNovoModal]       = useState(false)
  const [novaReserva, setNovaReserva]   = useState<Partial<Reserva>>({ status: 'pendente', valor_pago: 0 })

  const [novaComod, setNovaComod]       = useState('')
  const [comodidades, setComodidades]   = useState<string[]>([])
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i)

  const [fotos, setFotos]             = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls]   = useState<string[]>([])
  const [uploading, setUploading]       = useState(false)
  const [isDragging, setIsDragging]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.usuario) setSession(d.usuario)
      else router.push('/login?redirect=/admin')
    })
  }, [router])

  useEffect(() => {
    fetch('/api/reservas').then(r => r.json()).then(d => setReservas(d.reservas ?? []))
    fetch('/api/precos').then(r => r.json()).then(d => setPrecos(d.precos ?? []))
    fetch('/api/configuracao').then(r => r.json()).then(d => {
      if (d.configuracao) {
        setConfig(d.configuracao)
        setComodidades(d.configuracao.comodidades ?? [])
        setFotos(d.configuracao.fotos ?? [])
      }
    })
  }, [])

  useEffect(() => {
    return () => { previewUrls.forEach(u => URL.revokeObjectURL(u)) }
  }, [previewUrls])

  const carregarDatas = useCallback(() => {
    const mesStr = `${calMes.ano}-${String(calMes.mes + 1).padStart(2,'0')}`
    fetch(`/api/datas?mes=${mesStr}`).then(r => r.json()).then(d => setDatasInfo(d.datas ?? []))
  }, [calMes])

  useEffect(() => { carregarDatas() }, [carregarDatas])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }
  function changeTab(t: Tab) { setTab(t); window.scrollTo({ top: 0 }) }

  function handleFilesSelected(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return

    const disponiveis = 30 - fotos.length - pendingFiles.length
    const novos = arr.slice(0, disponiveis)
    if (!novos.length) { showToast('Limite de 30 fotos atingido!'); return }

    const urls = novos.map(f => URL.createObjectURL(f))
    setPendingFiles(prev => [...prev, ...novos])
    setPreviewUrls(prev => [...prev, ...urls])
  }

  function removePending(idx: number) {
    URL.revokeObjectURL(previewUrls[idx])
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
  }

  async function removerFotoSalva(url: string) {
    const novaLista = fotos.filter(f => f !== url)
    const res = await fetch('/api/configuracao', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...config, comodidades, fotos: novaLista }),
    })
    if (res.ok) {
      setFotos(novaLista)
      showToast('Foto removida.')
    } else {
      showToast('Erro ao remover foto.')
    }
  }

  async function uploadPendentes() {
    if (!pendingFiles.length) return
    setUploading(true)
    try {
      const novasUrls: string[] = []

      for (const file of pendingFiles) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/fotos/upload', { method: 'POST', body: form })
        if (!res.ok) { showToast(`Erro no upload de ${file.name}`); continue }
        const { url } = await res.json()
        novasUrls.push(url)
      }

      const listaFinal = [...fotos, ...novasUrls]

      await fetch('/api/configuracao', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...config, comodidades, fotos: listaFinal }),
      })

      setFotos(listaFinal)
      previewUrls.forEach(u => URL.revokeObjectURL(u))
      setPendingFiles([])
      setPreviewUrls([])
      showToast(`${novasUrls.length} foto(s) salvas!`)
    } finally {
      setUploading(false)
    }
  }

  function getDiasCalMes() {
    const { ano, mes } = calMes
    const primeiro = new Date(ano, mes, 1)
    const ultimo   = new Date(ano, mes + 1, 0)
    const offset   = primeiro.getDay()
    const dias: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d))
    return dias
  }

  function getDiaStatusAdm(date: Date) {
    const iso  = date.toISOString().split('T')[0]
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    if (date < hoje) return 'past'
    if (isFeriado(date)) return 'feriado'
    const info = datasInfo.find(d => d.data === iso)
    if (!info) return 'livre'
    if (info.motivo === 'reserva_confirmada') return 'reservado'
    return 'bloqueado'
  }

  function toggleDia(date: Date) {
    const iso    = date.toISOString().split('T')[0]
    const status = getDiaStatusAdm(date)
    if (status === 'past' || status === 'feriado' || status === 'reservado') return
    setPendentes(prev => {
      const next = new Map(prev)
      if (next.has(iso)) { next.delete(iso); return next }
      next.set(iso, status === 'bloqueado' ? 'liberar' : 'bloquear')
      return next
    })
  }

  async function salvarCalendario() {
    const bloquear = [...pendentes.entries()].filter(([,a]) => a === 'bloquear').map(([d]) => d)
    const liberar  = [...pendentes.entries()].filter(([,a]) => a === 'liberar').map(([d]) => d)
    if (bloquear.length) await fetch('/api/datas/bloquear', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ datas: bloquear, acao: 'bloquear' }) })
    if (liberar.length)  await fetch('/api/datas/bloquear', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ datas: liberar, acao: 'liberar' }) })
    setPendentes(new Map()); carregarDatas(); showToast('Calendário salvo!')
  }

  function getDiaCls(date: Date) {
    const iso    = date.toISOString().split('T')[0]
    const status = getDiaStatusAdm(date)
    const pend   = pendentes.get(iso)
    let base = 'adm-cal-day aspect-square flex items-center justify-center text-xs select-none'
    if (pend) base += ' outline outline-2 outline-amber-400 outline-offset-[-2px]'
    if (status === 'past')      return base + ' adm-past text-stone-300'
    if (status === 'feriado')   return base + ' adm-holiday'
    if (status === 'reservado') return base + ' adm-reserved'
    const efetivo = pend ? (pend === 'bloquear' ? 'bloqueado' : 'livre') : status
    if (efetivo === 'bloqueado') return base + ' adm-blocked'
    return base + ' text-stone-700'
  }

  async function confirmarReserva(reserva: Reserva) {
    try {
      const res = await fetch(`/api/reservas/${reserva.token}/confirmar`, {
        method:'POST',
      })
      if (res.ok) {
        setReservas(prev => prev.map(r => r.id === reserva.id ? { ...r, status: 'confirmada' } : r))
        carregarDatas(); showToast('Reserva confirmada! Datas bloqueadas.')
      } else { 
        const d = await res.json(); 
        showToast(d.error ?? 'Erro ao confirmar.') 
      }
    } catch {
      showToast('Erro ao confirmar reserva.')
    } finally {
      setConfirmModal(null)
    }
  }

  async function salvarEdicao(reserva: Reserva) {
    try {
      const res = await fetch(`/api/reservas/${reserva.token}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(reserva),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')

      setReservas(prev => prev.map(r => r.token === reserva.token ? data.reserva : r))
      showToast('Reserva atualizada com sucesso!')
      setEditModal(null)
      carregarDatas()
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar. Tente novamente.'))
    }
  }

  async function criarManual() {
    if (!novaReserva.nome || !novaReserva.data_inicio || !novaReserva.data_fim) {
      showToast('Preencha os campos obrigatórios!'); return
    }
    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaReserva),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro ao criar')

      setReservas(prev => [d.reserva || { ...novaReserva, id: d.token, token: d.token }, ...prev])
      showToast('Reserva criada com sucesso!')
      setNovoModal(false)
      setNovaReserva({ status: 'pendente', valor_pago: 0 })
      
      if (novaReserva.status === 'confirmada') carregarDatas()
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao criar.'))
    }
  }

  async function deletarReserva(token: string) {
    if (!confirm('Tem certeza que deseja DELETAR esta reserva permanentemente? Esta ação não pode ser desfeita.')) return
    try {
      const res = await fetch(`/api/reservas/${token}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      setReservas(prev => prev.filter(r => r.token !== token))
      showToast('Reserva excluída com sucesso!')
      carregarDatas()
    } catch {
      showToast('Erro ao excluir.')
    }
  }

  async function cancelarReserva(token: string) {
    const res = await fetch(`/api/reservas/${token}/cancelar`, { method: 'POST' })
    if (res.ok) { setReservas(prev => prev.map(r => r.token === token ? { ...r, status: 'cancelada' } : r)); showToast('Reserva cancelada.') }
  }

  async function salvarPrecos() {
    await fetch('/api/precos', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ precos }) })
    showToast('Preços salvos!')
  }

  async function salvarDetalhes() {
    await fetch('/api/configuracao', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...config, comodidades, fotos }) })
    showToast('Detalhes salvos!')
  }

  const pendentesCount = reservas.filter(r => r.status === 'pendente').length
  const confirmadas    = reservas.filter(r => r.status === 'confirmada')
  const receitaTotal   = confirmadas.reduce((s, r) => s + Number(r.valor_total), 0)
  const diasReservados = datasInfo.filter(d => d.motivo === 'reserva_confirmada').length
  const diasBloqueados = datasInfo.filter(d => d.motivo === 'bloqueado_admin').length
  const diasCalMes     = getDiasCalMes()

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <svg className="spinner w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
    </div>
  )

  return (
    <div className="font-sans bg-stone-50 text-stone-800 min-h-screen">

      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSidebarOpen(o => !o)
              if (mainRef.current) mainRef.current.style.marginLeft = sidebarOpen ? '0' : '224px'
            }}
            className="w-8 h-8 rounded-lg items-center justify-center text-stone-400 hover:bg-stone-100 transition-all hidden md:flex"
          >
            <IconHamburger />
          </button>
          <span className="font-serif text-lg">Fortuna<span className="text-green-500">.</span></span>
          <span className={`text-xs text-stone-300 transition-opacity ${sidebarOpen ? '' : 'opacity-0'}`}>|</span>
          <span className={`text-xs text-stone-400 font-medium hidden md:inline transition-opacity ${sidebarOpen ? '' : 'opacity-0'}`}>Painel Administrativo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-stone-400">
            Olá, <span className="text-stone-700 font-medium">{session.nome.split(' ')[0]}</span>
          </span>
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center">
            {session.nome.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout} className="text-xs text-stone-400 hover:text-red-500 transition-colors hidden sm:inline">Sair</button>
        </div>
      </header>

      <div className="flex pt-14 min-h-screen">
        <aside
          id="sidebar"
          className="fixed left-0 top-14 bottom-0 bg-white border-r border-stone-200 flex-col py-4 z-40 hidden md:flex"
          style={{ width: sidebarOpen ? '224px' : '0', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}
        >
          <nav className="flex-1 px-3 space-y-0.5" style={{ width: '200px' }}>
            {([
              { id: 'dashboard',  label: 'Dashboard',  icon: <IconGrid />  },
              { id: 'reservas',   label: 'Reservas',   icon: <IconCal />,  badge: pendentesCount || undefined },
              { id: 'calendario', label: 'Calendário', icon: <IconCal />   },
              { id: 'fotos',      label: 'Fotos',      icon: <IconPhoto />, badge: pendingFiles.length || undefined },
              { id: 'precos',     label: 'Preços',     icon: <IconMoney /> },
              { id: 'detalhes',   label: 'Detalhes',   icon: <IconEdit />  },
            ] as { id: Tab; label: string; icon: React.ReactNode; badge?: number }[]).map(item => (
              <button
                key={item.id}
                onClick={() => changeTab(item.id)}
                className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left ${tab === item.id ? 'active' : 'text-stone-500'}`}
              >
                {item.icon}
                {item.label}
                {item.badge ? (
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="px-4 pb-2" style={{ width: '200px' }}>
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-stone-400 hover:text-green-600 transition-colors">
              <IconLink /> Ver site
            </a>
          </div>
        </aside>

        <main
          ref={mainRef}
          id="mainContent"
          className="flex-1 p-4 md:p-8 pb-24 md:pb-8"
          style={{ marginLeft: sidebarOpen ? '224px' : '0', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
        >

          {tab === 'dashboard' && (
            <div className="animate-in">
              <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">Bom dia, {session.nome.split(' ')[0]} 👋</h1>
                <p className="text-stone-400 text-sm mt-1">Resumo do mês.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { val: `R$ ${receitaTotal.toLocaleString('pt-BR')}`, label: 'Receita confirmada', cls: 'bg-white border-stone-200' },
                  { val: diasReservados, label: 'Dias reservados', cls: 'bg-white border-stone-200' },
                  { val: pendentesCount, label: 'Pendentes', cls: pendentesCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-stone-200' },
                  { val: diasBloqueados, label: 'Bloqueados pelo admin', cls: 'bg-white border-stone-200' },
                ].map(card => (
                  <div key={card.label} className={`${card.cls} border rounded-2xl p-4 md:p-5`}>
                    <div className={`text-xl md:text-2xl font-light mb-1 ${pendentesCount > 0 && card.label === 'Pendentes' ? 'text-amber-700' : 'text-stone-900'}`}>{card.val}</div>
                    <div className={`text-xs ${pendentesCount > 0 && card.label === 'Pendentes' ? 'text-amber-500' : 'text-stone-400'}`}>{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-stone-800">Próximas reservas</h2>
                  <button onClick={() => changeTab('reservas')} className="text-xs text-green-600 hover:text-green-700">Ver todas →</button>
                </div>
                {reservas.filter(r => r.status !== 'cancelada').slice(0,4).map(r => (
                  <div key={r.id} className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-stone-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-500 text-xs font-medium flex items-center justify-center flex-none">
                        {r.nome.split(' ').map(n => n[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-stone-800">{r.nome}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{fmt(r.data_inicio)} · R$ {Number(r.valor_total).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.status === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                      {r.status === 'pendente' && (
                        <button onClick={() => setConfirmModal(r)} className="text-xs border border-green-300 text-green-700 px-3 py-1 rounded-full hover:bg-green-50 transition-colors hidden sm:inline">Confirmar</button>
                      )}
                    </div>
                  </div>
                ))}
                {reservas.length === 0 && <p className="px-6 py-8 text-center text-sm text-stone-400">Nenhuma reserva ainda.</p>}
              </div>
            </div>
          )}

          {tab === 'reservas' && (
            <div className="animate-in">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-serif text-stone-900">Reservas</h1>
                  <p className="text-stone-400 text-sm mt-1">Gerencie todas as reservas.</p>
                </div>
                <div className="flex bg-stone-100 p-1 rounded-xl self-start">
                  {['todas', 'pendente', 'confirmada', 'cancelada'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFiltroStatus(s)}
                      className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg transition-all ${filtroStatus === s ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      {s === 'todas' ? 'Todas' : s === 'confirmada' ? 'Pagas/Conf.' : s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setNovoModal(true)}
                  className="flex items-center gap-2 bg-stone-900 text-white text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-xl hover:bg-stone-700 transition-all shadow-sm"
                >
                  <IconPlus /> Adicionar Reserva
                </button>
              </div>
              <div className="flex flex-col gap-3 md:hidden">
                {reservas.map(r => (
                  <div key={r.id} className={`bg-white border rounded-2xl p-4 ${r.status === 'pendente' ? 'border-amber-200' : 'border-stone-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-stone-800">{r.nome}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{r.email} · {r.telefone}</div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-none ${r.status === 'confirmada' ? 'bg-green-100 text-green-700' : r.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>{r.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div><div className="text-[10px] text-stone-400 mb-0.5">Início</div><div className="text-xs font-medium text-stone-700">{fmt(r.data_inicio)}</div></div>
                      <div><div className="text-[10px] text-stone-400 mb-0.5">Fim</div><div className="text-xs font-medium text-stone-700">{fmt(r.data_fim)}</div></div>
                      <div><div className="text-[10px] text-stone-400 mb-0.5">Valor</div><div className="text-xs font-medium text-green-600">R$ {Number(r.valor_total).toLocaleString('pt-BR')}</div></div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <code className="text-[10px] bg-stone-100 text-stone-400 px-2 py-0.5 rounded">{r.token}</code>
                      <div className="flex gap-2">
                        {r.status === 'pendente' && <button onClick={() => setConfirmModal(r)} className="text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors">Confirmar</button>}
                        {r.status !== 'cancelada' && <button onClick={() => cancelarReserva(r.token)} className="text-xs text-stone-400 hover:text-red-500 transition-colors">Cancelar</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-xs text-stone-400 font-medium uppercase tracking-wide">
                      <th className="text-left px-6 py-3">Cliente</th>
                      <th className="text-left px-4 py-3">Contrato</th>
                      <th className="text-left px-4 py-3">Período</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3">Pago</th>
                      <th className="text-right px-4 py-3">Saldo</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {reservas
                      .filter(r => filtroStatus === 'todas' || r.status === filtroStatus)
                      .map(r => (
                      <tr key={r.id} className={r.status === 'cancelada' ? 'opacity-50' : ''}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-stone-800">{r.nome}</div>
                          <div className="text-[10px] text-stone-400">{r.email} · {r.telefone}</div>
                        </td>
                        <td className="px-4 py-4 text-xs text-stone-500">
                          {r.contrato ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-medium self-start">{r.contrato}</span>
                              {r.contrato_assinado && <span className="text-[9px] text-green-600 font-bold uppercase">Assinado</span>}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-4 text-xs text-stone-600">{fmt(r.data_inicio)}{r.data_inicio !== r.data_fim && ` → ${fmt(r.data_fim)}`}</td>
                        <td className="px-4 py-4 text-right font-medium text-stone-800">R$ {Number(r.valor_total).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-4 text-right text-xs text-green-600">{r.valor_pago ? `R$ ${Number(r.valor_pago).toLocaleString('pt-BR')}` : '-'}</td>
                        <td className="px-4 py-4 text-right text-xs font-medium text-red-500">{r.saldo ? `R$ ${Number(r.saldo).toLocaleString('pt-BR')}` : '-'}</td>
                        <td className="px-4 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.status === 'confirmada' ? 'bg-green-100 text-green-700' : r.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>{r.status}</span></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => setEditModal(r)} className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-all" title="Editar"><IconEdit /></button>
                            {r.status === 'pendente' && <button onClick={() => setConfirmModal(r)} className="text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors">Confirmar</button>}
                            {r.status !== 'cancelada' && <button onClick={() => cancelarReserva(r.token)} className="text-xs text-stone-400 hover:text-red-500 transition-colors">Cancelar</button>}
                            <button onClick={() => deletarReserva(r.token)} className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir Permanentemente"><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reservas.filter(r => filtroStatus === 'todas' || r.status === filtroStatus).length === 0 && <p className="px-6 py-8 text-center text-sm text-stone-400">Nenhuma reserva encontrada com este filtro.</p>}
              </div>
            </div>
          )}

          {tab === 'calendario' && (
            <div className="animate-in">
              <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">Calendário</h1>
                <p className="text-stone-400 text-sm mt-1">Clique em dias para bloquear ou liberar.</p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-6 max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-stone-900 hidden sm:block">{MESES[calMes.mes]} {calMes.ano}</h3>
                    <div className="flex gap-1 items-center">
                      <select
                        value={calMes.mes}
                        onChange={(e) => { setCalMes(p => ({ ...p, mes: Number(e.target.value) })); setPendentes(new Map()) }}
                        className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-green-500"
                      >
                        {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select
                        value={calMes.ano}
                        onChange={(e) => { setCalMes(p => ({ ...p, ano: Number(e.target.value) })); setPendentes(new Map()) }}
                        className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-green-500"
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setCalMes(p => { let m=p.mes-1,a=p.ano; if(m<0){m=11;a--} return {mes:m,ano:a} }); setPendentes(new Map()) }} className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:border-stone-400 text-sm flex items-center justify-center">‹</button>
                    <button onClick={() => { setCalMes(p => { let m=p.mes+1,a=p.ano; if(m>11){m=0;a++} return {mes:m,ano:a} }); setPendentes(new Map()) }} className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:border-stone-400 text-sm flex items-center justify-center">›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DIAS_SEMANA.map(d => <div key={d} className="text-center text-[10px] font-medium text-stone-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {diasCalMes.map((date, i) => {
                    if (!date) return <div key={`e${i}`} />
                    return <div key={date.toISOString()} className={getDiaCls(date)} onClick={() => toggleDia(date)}>{date.getDate()}</div>
                  })}
                </div>
                {pendentes.size > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-amber-700 font-medium">
                        {[...pendentes.values()].filter(v=>v==='bloquear').length > 0 && `${[...pendentes.values()].filter(v=>v==='bloquear').length} para bloquear`}
                        {[...pendentes.values()].filter(v=>v==='bloquear').length > 0 && [...pendentes.values()].filter(v=>v==='liberar').length > 0 && ' · '}
                        {[...pendentes.values()].filter(v=>v==='liberar').length > 0 && `${[...pendentes.values()].filter(v=>v==='liberar').length} para liberar`}
                      </span>
                      <div className="flex gap-2 flex-none">
                        <button onClick={() => setPendentes(new Map())} className="text-xs text-stone-400 px-2 py-1 rounded-lg border border-stone-200 bg-white">Descartar</button>
                        <button onClick={salvarCalendario} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-green-600">Salvar</button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap gap-3">
                  {[['bg-green-500','Disponível'],['bg-red-200','Bloqueado'],['bg-indigo-200','Reservado'],['bg-amber-300','Feriado']].map(([bg,label]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-stone-400"><div className={`w-3 h-3 rounded-full ${bg}`} />{label}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === 'fotos' && (
            <div className="animate-in">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-serif text-stone-900">Fotos</h1>
                  <p className="text-stone-400 text-sm mt-1">
                    {fotos.length} de 30 fotos cadastradas
                    {pendingFiles.length > 0 && <span className="text-amber-600 ml-2">· {pendingFiles.length} aguardando envio</span>}
                  </p>
                </div>
                {pendingFiles.length > 0 && (
                  <button
                    onClick={uploadPendentes}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {uploading ? (
                      <svg className="spinner w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                    ) : (
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    )}
                    {uploading ? 'Enviando...' : `Enviar ${pendingFiles.length} foto${pendingFiles.length > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-6 space-y-6">

                {fotos.length < 30 && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => { if (e.target.files) handleFilesSelected(e.target.files); e.target.value = '' }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => {
                        e.preventDefault(); setIsDragging(false)
                        if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
                      }}
                      className={`drag-zone rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-green-400 bg-green-50' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                        <svg width="18" height="18" fill="none" stroke="#a8a29e" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <p className="text-sm text-stone-400 mb-1">
                        {isDragging ? 'Solte as fotos aqui' : <>Arraste as fotos ou <span className="text-green-600">clique para selecionar</span></>}
                      </p>
                      <p className="text-xs text-stone-300">JPG, PNG · Máx 5MB · Até {30 - fotos.length} foto(s)</p>
                    </div>
                  </div>
                )}

                {pendingFiles.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-3">
                      Aguardando envio ({pendingFiles.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {previewUrls.map((url, i) => (
                        <div key={url} className="group relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-amber-300">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <button
                              onClick={() => removePending(i)}
                              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                              title="Remover"
                            >
                              <IconTrash />
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                            <span className="text-white text-[10px] truncate block">{pendingFiles[i]?.name}</span>
                          </div>
                          <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            PENDENTE
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-3">
                    Fotos cadastradas ({fotos.length})
                  </p>

                  {fotos.length === 0 && pendingFiles.length === 0 ? (
                    <p className="text-sm text-stone-400 py-4 text-center">Nenhuma foto cadastrada ainda.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {fotos.map((url, i) => (
                        <div key={url} className="group relative aspect-video rounded-xl overflow-hidden bg-stone-100">
                          <img
                            src={url}
                            alt={`Foto ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                            <button
                              onClick={() => removerFotoSalva(url)}
                              className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 scale-90 group-hover:scale-100"
                              title="Remover foto"
                            >
                              <IconTrash />
                            </button>
                          </div>
                          <div className="absolute top-1.5 left-1.5 bg-black/40 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                            {i + 1}
                          </div>
                        </div>
                      ))}
                      {fotos.length < 30 && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-video border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all gap-1"
                        >
                          <span className="text-stone-300 text-2xl leading-none">+</span>
                          <span className="text-stone-400 text-[10px]">Adicionar</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {tab === 'precos' && (
            <div className="animate-in">
              <div className="mb-6"><h1 className="text-xl md:text-2xl font-serif text-stone-900">Preços</h1><p className="text-stone-400 text-sm mt-1">Defina os valores por tipo de diária.</p></div>
              <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 max-w-xl">
                {precos.map((p, i) => (
                  <div key={p.tipo} className="px-4 md:px-6 py-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-stone-800">{p.label}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{p.tipo === 'semana' ? 'Segunda a Sexta-feira' : p.tipo === 'fds' ? 'Sábado e Domingo' : 'Feriados oficiais'}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className="text-xs text-stone-400">R$</span>
                      <input
                        type="number"
                        value={p.valor}
                        onChange={e => setPrecos(prev => prev.map((x,j) => j===i ? {...x, valor: Number(e.target.value)} : x))}
                        className="w-20 md:w-24 text-right text-sm font-medium border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                ))}
                <div className="px-4 md:px-6 py-4 flex justify-end">
                  <button onClick={salvarPrecos} className="bg-stone-900 text-white text-sm px-5 py-2 rounded-xl hover:bg-stone-700 transition-colors">Salvar preços</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'detalhes' && config && (
            <div className="animate-in">
              <div className="mb-6"><h1 className="text-xl md:text-2xl font-serif text-stone-900">Detalhes do espaço</h1><p className="text-stone-400 text-sm mt-1">Informações exibidas para os visitantes.</p></div>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-6">
                  <h3 className="text-sm font-medium text-stone-600 pb-3 mb-4 border-b border-stone-100">Identificação</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label:'Nome do espaço',    key:'nome',            span:'sm:col-span-2', type:'text' },
                      { label:'Localização',        key:'localizacao',     span:'',              type:'text' },
                      { label:'WhatsApp do admin',  key:'whatsapp_admin',  span:'',              type:'tel'  },
                      { label:'Endereço',           key:'endereco',        span:'sm:col-span-2', type:'text' },
                      { label:'Número',             key:'numero',          span:'',              type:'text' },
                      { label:'Ponto de referência',key:'ponto_referencia',span:'sm:col-span-2', type:'text' },
                    ].map(f => (
                      <div key={f.key} className={f.span}>
                        <label className="block text-xs text-stone-400 mb-1.5">{f.label}</label>
                        <input
                          type={f.type}
                          value={config[f.key as keyof Configuracao] as string ?? ''}
                          onChange={e => setConfig(prev => prev ? {...prev, [f.key]: e.target.value} : prev)}
                          className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:border-green-500"
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-xs text-stone-400 mb-1.5">Descrição curta</label>
                      <textarea
                        rows={2}
                        value={config.descricao ?? ''}
                        onChange={e => setConfig(prev => prev ? {...prev, descricao: e.target.value} : prev)}
                        className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-800 resize-none focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-6">
                  <h3 className="text-sm font-medium text-stone-600 pb-3 mb-4 border-b border-stone-100">Especificações</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-4">
                    {([
                      { label:'Área (m²)',  key:'area_m2'    },
                      { label:'Capacidade', key:'capacidade' },
                      { label:'Quartos',    key:'quartos'    },
                      { label:'Banheiros',  key:'banheiros'  },
                      { label:'Vagas',      key:'vagas'      },
                    ] as {label:string,key:keyof Configuracao}[]).map(f => (
                      <div key={f.key} className="flex-1 min-w-28">
                        <label className="block text-xs text-stone-400 mb-1.5">{f.label}</label>
                        <input
                          type="number"
                          value={config[f.key as keyof Configuracao] as number ?? ''}
                          onChange={e => setConfig(prev => prev ? {...prev, [f.key]: Number(e.target.value)} : prev)}
                          className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:border-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-6">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                    <h3 className="text-sm font-medium text-stone-600">Comodidades</h3>
                    <button onClick={() => setComodModal(true)} className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors flex items-center gap-1.5">
                      <IconPlus /> Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {comodidades.map(c => (
                      <span key={c} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full flex items-center gap-1.5">
                        {c}
                        <button onClick={() => setComodidades(prev => prev.filter(x => x !== c))} className="text-green-400 hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pb-2">
                  <button onClick={salvarDetalhes} className="bg-stone-900 text-white text-sm px-5 py-2 rounded-xl hover:bg-stone-700 transition-colors">Salvar detalhes</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <nav id="bottomNav">
        {([
          { id:'dashboard', label:'Início',     icon:<IconGrid />   },
          { id:'reservas',  label:'Reservas',   icon:<IconCal />,   badge: pendentesCount || undefined },
          { id:'calendario',label:'Calendário', icon:<IconCal />    },
          { id:'fotos',     label:'Fotos',      icon:<IconPhoto />, badge: pendingFiles.length || undefined },
          { id:'detalhes',  label:'Detalhes',   icon:<IconEdit />   },
        ] as {id:Tab,label:string,icon:React.ReactNode,badge?:number}[]).map(item => (
          <button key={item.id} className={`bnav-btn ${tab === item.id ? 'active' : ''}`} onClick={() => changeTab(item.id)}>
            {item.icon}
            {item.badge ? <span className="bnav-badge">{item.badge}</span> : null}
            {item.label}
          </button>
        ))}
      </nav>

      {confirmModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null) }}>
          <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-serif text-lg text-stone-900 mb-1">Confirmar reserva</h3>
            <p className="text-xs text-stone-400 mb-4">{fmt(confirmModal.data_inicio)} · confirmar e bloquear datas</p>
            <div className="bg-stone-50 rounded-xl p-4 mb-5 space-y-2">
              {[['Cliente',fmt(confirmModal.nome)],['Data início',fmt(confirmModal.data_inicio)],['Data fim',fmt(confirmModal.data_fim)],['Valor',`R$ ${Number(confirmModal.valor_total).toLocaleString('pt-BR')}`]].map(([l,v]) => (
                <div key={l} className="flex justify-between text-xs"><span className="text-stone-400">{l}</span><span className="font-medium text-stone-700">{v}</span></div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mb-4">Ao confirmar, as datas serão <strong>bloqueadas automaticamente</strong>.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal(null)} className="flex-1 text-sm border border-stone-200 py-2.5 rounded-xl text-stone-500 hover:bg-stone-50">Cancelar</button>
              <button onClick={() => confirmarReserva(confirmModal)} className="flex-1 text-sm bg-green-500 text-white py-2.5 rounded-xl hover:bg-green-600 font-medium flex items-center justify-center gap-1.5"><IconCheck /> Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {comodModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setComodModal(false) }}>
          <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-serif text-lg text-stone-900 mb-4">Nova comodidade</h3>
            <label className="block text-xs text-stone-400 mb-1.5">Nome</label>
            <input
              type="text" value={novaComod} onChange={e => setNovaComod(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && novaComod.trim()) { setComodidades(p => [...p, novaComod.trim()]); setNovaComod(''); setComodModal(false) } }}
              placeholder="Ex: Sauna, Área de jogos..." autoFocus
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-800 mb-4 focus:outline-none focus:border-green-500"
            />
            <div className="flex gap-2">
              <button onClick={() => { setComodModal(false); setNovaComod('') }} className="flex-1 text-sm border border-stone-200 py-2.5 rounded-xl text-stone-500 hover:bg-stone-50">Cancelar</button>
              <button onClick={() => { if(novaComod.trim()) { setComodidades(p => [...p, novaComod.trim()]); setNovaComod(''); setComodModal(false) } }} className="flex-1 text-sm bg-stone-900 text-white py-2.5 rounded-xl hover:bg-stone-700 font-medium">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}>
          <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg text-stone-900 mb-4">Editar reserva</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1.5 uppercase font-bold tracking-wider">Status</label>
                <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
                  {RESERVA_STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditModal(p => p ? { ...p, status: s } : null)}
                      className={`flex-1 text-[10px] uppercase tracking-wider font-bold py-2 rounded-lg transition-all ${editModal.status === s ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Nome do Cliente *</label>
                <input
                  type="text"
                  value={editModal.nome ?? ''}
                  onChange={e => setEditModal(p => p ? { ...p, nome: e.target.value } : null)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={editModal.email ?? ''}
                    onChange={e => setEditModal(p => p ? { ...p, email: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Telefone</label>
                  <input
                    type="tel"
                    value={editModal.telefone ?? ''}
                    onChange={e => setEditModal(p => p ? { ...p, telefone: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Data Início *</label>
                  <input
                    type="date"
                    value={editModal.data_inicio ?? ''}
                    onChange={e => setEditModal(p => p ? { ...p, data_inicio: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Data Fim *</label>
                  <input
                    type="date"
                    value={editModal.data_fim ?? ''}
                    onChange={e => setEditModal(p => p ? { ...p, data_fim: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Contrato</label>
                  <input
                    type="text"
                    value={editModal.contrato ?? ''}
                    onChange={e => setEditModal(p => p ? { ...p, contrato: e.target.value } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                    placeholder="Ex: 015/2026"
                  />
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editModal.contrato_assinado ?? false}
                      onChange={e => setEditModal(p => p ? { ...p, contrato_assinado: e.target.checked } : null)}
                      className="w-4 h-4 rounded text-green-500 focus:ring-green-500 border-stone-300"
                    />
                    <span className="text-xs text-stone-600">Contrato assinado</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Valor Pago (R$)</label>
                  <input
                    type="number"
                    value={editModal.valor_pago ?? 0}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setEditModal(p => p ? { ...p, valor_pago: v, saldo: (p.valor_total || 0) - v } : null)
                    }}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={editModal.valor_total ?? 0}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setEditModal(p => p ? { ...p, valor_total: v, saldo: v - (p.valor_pago || 0) } : null)
                    }}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Saldo (R$)</label>
                  <input
                    type="number"
                    value={editModal.saldo ?? 0}
                    onChange={e => setEditModal(p => p ? { ...p, saldo: Number(e.target.value) } : null)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Detalhes do pagamento / Observações</label>
                <textarea
                  rows={3}
                  value={editModal.pgto_detalhes ?? ''}
                  onChange={e => setEditModal(p => p ? { ...p, pgto_detalhes: e.target.value } : null)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500 resize-none"
                  placeholder="Datas de parcelas, forma de pgto..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-stone-100">
              <button onClick={() => setEditModal(null)} className="flex-1 text-sm border border-stone-200 py-2.5 rounded-xl text-stone-500 hover:bg-stone-50">Cancelar</button>
              <button onClick={() => salvarEdicao(editModal)} className="flex-1 text-sm bg-stone-900 text-white py-2.5 rounded-xl hover:bg-stone-700 font-medium">Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {novoModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setNovoModal(false) }}>
          <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg text-stone-900 mb-4">Nova reserva manual</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1.5 uppercase font-bold tracking-wider">Status Inicial</label>
                <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
                  {NOVA_RESERVA_STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setNovaReserva(p => ({ ...p, status: s }))}
                      className={`flex-1 text-[10px] uppercase tracking-wider font-bold py-2 rounded-lg transition-all ${novaReserva.status === s ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Nome do Cliente *</label>
                <input
                  type="text"
                  value={novaReserva.nome ?? ''}
                  onChange={e => setNovaReserva(p => ({ ...p, nome: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={novaReserva.email ?? ''}
                    onChange={e => setNovaReserva(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Telefone</label>
                  <input
                    type="tel"
                    value={novaReserva.telefone ?? ''}
                    onChange={e => setNovaReserva(p => ({ ...p, telefone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Data Início *</label>
                  <input
                    type="date"
                    value={novaReserva.data_inicio ?? ''}
                    onChange={e => setNovaReserva(p => ({ ...p, data_inicio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Data Fim *</label>
                  <input
                    type="date"
                    value={novaReserva.data_fim ?? ''}
                    onChange={e => setNovaReserva(p => ({ ...p, data_fim: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-stone-100">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Contrato</label>
                  <input
                    type="text"
                    value={novaReserva.contrato ?? ''}
                    onChange={e => setNovaReserva(p => ({ ...p, contrato: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Valor Pago (R$)</label>
                  <input
                    type="number"
                    value={novaReserva.valor_pago ?? 0}
                    onChange={e => setNovaReserva(p => ({ ...p, valor_pago: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-stone-100">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={novaReserva.valor_total || ''}
                    onChange={e => setNovaReserva(p => ({ ...p, valor_total: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              
              <p className="text-[10px] text-stone-400">O valor total e o saldo serão calculados automaticamente se você deixar em branco (com base na tabela de preços).</p>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-stone-100">
              <button onClick={() => setNovoModal(false)} className="flex-1 text-sm border border-stone-200 py-2.5 rounded-xl text-stone-500 hover:bg-stone-50">Cancelar</button>
              <button onClick={criarManual} className="flex-1 text-sm bg-stone-900 text-white py-2.5 rounded-xl hover:bg-stone-700 font-medium">Criar Reserva</button>
            </div>
          </div>
        </div>
      )}

      {toast && (


        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-stone-900 text-white text-sm px-5 py-3 rounded-full shadow-lg z-50 fade-up">{toast}</div>
      )}
    </div>
  )
}
