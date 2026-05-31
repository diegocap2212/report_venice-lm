'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Squad, Report, EventType, ActionStatus, EVENT_CONFIG } from '@/types'
import { Plus, Trash2, ChevronDown, CheckCircle } from 'lucide-react'
import { ConeUpload } from '@/components/form/ConeUpload'

interface ActionDraft {
  owner: string
  action: string
  due_date: string
  status: ActionStatus
}

interface EventDraft {
  squad_id: string
  type: EventType
  text: string
  sprint_ref: string
  affects_throughput: boolean
  affects_lead_time: boolean
  action_plans: ActionDraft[]
}

const EMPTY_ACTION: ActionDraft = { owner: '', action: '', due_date: '', status: 'planned' }
const EMPTY_EVENT = (squadId: string): EventDraft => ({
  squad_id: squadId,
  type: 'context',
  text: '',
  sprint_ref: '',
  affects_throughput: false,
  affects_lead_time: false,
  action_plans: [],
})

export default function FillPage() {
  const params = useSearchParams()
  const router = useRouter()
  const reportSlug = params.get('report')

  const [squads, setSquads] = useState<Squad[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [events, setEvents] = useState<EventDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // New report form
  const [newReport, setNewReport] = useState({ period_label: '', period_start: '', period_end: '', slug: '' })
  const [creatingReport, setCreatingReport] = useState(false)

  useEffect(() => {
    fetch('/api/squads').then(r => r.json()).then(setSquads)
    if (reportSlug) {
      fetch(`/api/reports/${reportSlug}`)
        .then(async r => {
          if (!r.ok) throw new Error('Relatório não encontrado')
          return r.json()
        })
        .then(d => setReport(d.report))
        .catch(err => {
          setError(err?.message || 'Erro ao carregar o relatório')
          setReport(null)
        })
    }
  }, [reportSlug])

  const createReport = async () => {
    if (!newReport.period_label || !newReport.period_start || !newReport.period_end) {
      setError('Preencha todos os campos do período')
      return
    }
    const slug = newReport.slug || newReport.period_label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    setCreatingReport(true)
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newReport, slug }),
    })
    const data = await res.json()
    setCreatingReport(false)
    if (data.error) { setError(data.error); return }
    setReport(data)
    router.push(`/fill?report=${data.slug}`, { scroll: false })
  }

  const addEvent = (squadId: string) => {
    setEvents(prev => [...prev, EMPTY_EVENT(squadId)])
  }

  const updateEvent = (idx: number, patch: Partial<EventDraft>) => {
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  const removeEvent = (idx: number) => {
    setEvents(prev => prev.filter((_, i) => i !== idx))
  }

  const addAction = (eventIdx: number) => {
    setEvents(prev => prev.map((e, i) =>
      i === eventIdx ? { ...e, action_plans: [...e.action_plans, { ...EMPTY_ACTION }] } : e
    ))
  }

  const updateAction = (evIdx: number, aIdx: number, patch: Partial<ActionDraft>) => {
    setEvents(prev => prev.map((e, i) =>
      i === evIdx ? {
        ...e,
        action_plans: e.action_plans.map((a, j) => j === aIdx ? { ...a, ...patch } : a)
      } : e
    ))
  }

  const saveAll = async () => {
    if (!report) return
    setSaving(true)
    setError('')
    try {
      for (const [i, ev] of events.entries()) {
        const { action_plans: _skip, ...eventPayload } = ev
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: { ...eventPayload, report_id: report.id, sort_order: i },
            action_plans: ev.action_plans.filter(a => a.owner && a.action),
          }),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
      }
      setSaved(true)
      setTimeout(() => router.push(`/reports/${report.slug}`), 1200)
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  // Group squads by SM
  const bySM: Record<string, Squad[]> = {}
  squads.forEach(sq => {
    const key = sq.sm?.name || 'Sem SM'
    if (!bySM[key]) bySM[key] = []
    bySM[key].push(sq)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0D2240] text-white py-5 px-8">
        <h1 className="text-lg font-medium">Torre LM — Preencher Report</h1>
        {report && (
          <p className="text-blue-200 text-sm mt-0.5">{report.period_label}</p>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Step 1: Select or create report */}
        {!report && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="font-medium text-gray-800 mb-4">1. Definir período do report</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Label (ex: Report Quinzenal · Maio 2026)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  value={newReport.period_label}
                  onChange={e => setNewReport(p => ({ ...p, period_label: e.target.value }))}
                  placeholder="Report Quinzenal · Maio 2026"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Slug (URL, opcional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  value={newReport.slug}
                  onChange={e => setNewReport(p => ({ ...p, slug: e.target.value }))}
                  placeholder="2026-mai-01 (gerado auto)"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Início do período</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  value={newReport.period_start}
                  onChange={e => setNewReport(p => ({ ...p, period_start: e.target.value }))}
                  max="2099-12-31"
                  min="2020-01-01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fim do período</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  value={newReport.period_end}
                  onChange={e => setNewReport(p => ({ ...p, period_end: e.target.value }))}
                  max="2099-12-31"
                  min="2020-01-01"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <button
              onClick={createReport}
              disabled={creatingReport}
              className="mt-4 bg-[#0D2240] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#1a3a6e] transition disabled:opacity-50"
            >
              {creatingReport ? 'Criando...' : 'Criar Report →'}
            </button>
          </div>
        )}

        {/* Step 2: Add events per squad */}
        {report && (
          <>
            {Object.entries(bySM).map(([smName, smSquads]) => (
              <div key={smName} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400 tracking-widest uppercase px-2">
                    SM · {smName}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {smSquads.map(squad => {
                  const squadEvents = events
                    .map((e, i) => ({ e, i }))
                    .filter(({ e }) => e.squad_id === squad.id)

                  return (
                    <div key={squad.id} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
                      <div className="bg-[#0D2240]/5 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-800 text-sm">{squad.name}</span>
                          <span className="text-gray-400 text-xs ml-2">· {squad.scope}</span>
                        </div>
                        <button
                          onClick={() => addEvent(squad.id)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
                        >
                          <Plus size={13} />
                          Adicionar evento
                        </button>
                      </div>

                      <div className="p-4 flex flex-col gap-3">
                        {/* Cone XLSX upload */}
                        {report && (
                          <ConeUpload
                            reportId={report.id}
                            squadId={squad.id}
                            squadName={squad.name}
                          />
                        )}
                        {squadEvents.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4 italic">
                            Nenhum evento ainda. Clique em "Adicionar evento".
                          </p>
                        )}
                        {squadEvents.map(({ e: ev, i: idx }) => {
                          const cfg = EVENT_CONFIG[ev.type]
                          const needsAction = ev.type === 'blocker' || ev.type === 'future'
                          return (
                            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="p-3 flex flex-col gap-2">
                                {/* Type selector */}
                                <div className="flex items-center gap-2">
                                  <select
                                    value={ev.type}
                                    onChange={e => updateEvent(idx, { type: e.target.value as EventType })}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                    style={{ color: cfg.color }}
                                  >
                                    {Object.entries(EVENT_CONFIG).map(([key, c]) => (
                                      <option key={key} value={key}>{c.label}</option>
                                    ))}
                                  </select>
                                  <input
                                    value={ev.sprint_ref}
                                    onChange={e => updateEvent(idx, { sprint_ref: e.target.value })}
                                    placeholder="Semana (ex: 13/Abr)"
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1.5 w-36 focus:outline-none focus:border-blue-400"
                                  />
                                  <div className="flex gap-3 ml-auto">
                                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={ev.affects_throughput}
                                        onChange={e => updateEvent(idx, { affects_throughput: e.target.checked })}
                                        className="rounded"
                                      />
                                      impacta vazão
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={ev.affects_lead_time}
                                        onChange={e => updateEvent(idx, { affects_lead_time: e.target.checked })}
                                        className="rounded"
                                      />
                                      impacta LT
                                    </label>
                                  </div>
                                  <button onClick={() => removeEvent(idx)} className="text-gray-300 hover:text-red-400 transition ml-2">
                                    <Trash2 size={14} />
                                  </button>
                                </div>

                                {/* Text */}
                                <textarea
                                  value={ev.text}
                                  onChange={e => updateEvent(idx, { text: e.target.value })}
                                  placeholder="Descreva o que aconteceu..."
                                  rows={2}
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-400"
                                />

                                {/* Action plans */}
                                {(needsAction || ev.action_plans.length > 0) && (
                                  <div className="border-t border-dashed border-gray-200 pt-2 mt-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-medium tracking-wide uppercase text-gray-400">
                                        Plano de ação{needsAction ? ' (obrigatório)' : ''}
                                      </span>
                                      <button
                                        onClick={() => addAction(idx)}
                                        className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                      >
                                        <Plus size={10} /> Adicionar
                                      </button>
                                    </div>
                                    {ev.action_plans.map((ap, ai) => (
                                      <div key={ai} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 mb-2">
                                        <input
                                          value={ap.owner}
                                          onChange={e => updateAction(idx, ai, { owner: e.target.value })}
                                          placeholder="Responsável"
                                          className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                        />
                                        <input
                                          value={ap.action}
                                          onChange={e => updateAction(idx, ai, { action: e.target.value })}
                                          placeholder="Ação"
                                          className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                        />
                                        <input
                                          type="date"
                                          value={ap.due_date}
                                          onChange={e => updateAction(idx, ai, { due_date: e.target.value })}
                                          className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                        />
                                        <select
                                          value={ap.status}
                                          onChange={e => updateAction(idx, ai, { status: e.target.value as ActionStatus })}
                                          className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                        >
                                          <option value="planned">Planejado</option>
                                          <option value="in_progress">Em andamento</option>
                                          <option value="done">Feito</option>
                                        </select>
                                      </div>
                                    ))}
                                    {ev.action_plans.length === 0 && (
                                      <button
                                        onClick={() => addAction(idx)}
                                        className="w-full text-xs text-gray-400 border border-dashed border-gray-200 rounded py-2 hover:border-blue-300 hover:text-blue-400 transition"
                                      >
                                        + Adicionar plano de ação
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Save button */}
            <div className="sticky bottom-6 flex justify-end">
              {error && <p className="text-red-500 text-sm mr-4 self-center">{error}</p>}
              <button
                onClick={saveAll}
                disabled={saving || saved}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition ${
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-[#0D2240] text-white hover:bg-[#1a3a6e]'
                } disabled:opacity-70`}
              >
                {saved ? <><CheckCircle size={16} /> Salvo! Redirecionando...</>
                  : saving ? 'Salvando...'
                  : 'Salvar e visualizar →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
