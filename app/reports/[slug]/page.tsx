'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Report, Event, ConeSnapshot, Squad } from '@/types'
import { SquadSection } from '@/components/report/SquadSection'

interface ReportData {
  report: Report
  events: (Event & { squad: Squad })[]
  snapshots: ConeSnapshot[]
}

export default function ReportPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/reports/${slug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Erro ao carregar report'); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Carregando report...</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-red-500">{error || 'Report não encontrado'}</div>
    </div>
  )

  const { report, events, snapshots } = data

  // Group squads in order
  const squadsMap = new Map<string, Squad>()
  events.forEach(e => { if (e.squad) squadsMap.set(e.squad.id, e.squad) })
  const squads = Array.from(squadsMap.values())

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D2240] text-white py-5 px-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Torre LM — Evolução da Operação</h1>
          <p className="text-blue-200 text-sm mt-0.5">{report.period_label}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-blue-200">
            {new Date(report.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div className={`text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block ${
            report.status === 'published' ? 'bg-green-600 text-white' : 'bg-white/20 text-white'
          }`}>
            {report.status === 'published' ? 'Publicado' : 'Rascunho'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
          {squads.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">Nenhum dado registrado ainda.</p>
              <p className="text-sm mt-2">
                <a href={`/fill?report=${slug}`} className="text-blue-600 underline">
                  Preencher formulário
                </a>
              </p>
            </div>
          ) : (
            squads.map(squad => (
              <SquadSection
                key={squad.id}
                squad={squad}
                events={events.filter(e => e.squad_id === squad.id)}
                snapshots={snapshots}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
