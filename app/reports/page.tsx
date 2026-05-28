'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Report } from '@/types'
import { FileText, Plus, ChevronRight } from 'lucide-react'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0D2240] text-white py-5 px-8 flex items-center justify-between">
        <h1 className="text-lg font-medium">Torre LM — Arquivo de Reports</h1>
        <Link
          href="/fill"
          className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={14} />
          Novo Report
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center text-gray-400 py-20">Carregando...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum report ainda.</p>
            <Link href="/fill" className="mt-4 inline-block text-blue-600 text-sm underline">
              Criar o primeiro report
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map(r => (
              <Link
                key={r.id}
                href={`/reports/${r.slug}`}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-800">{r.period_label}</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {new Date(r.period_end).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    r.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {r.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
