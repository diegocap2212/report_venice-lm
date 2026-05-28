'use client'
import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface Props {
  reportId: string
  squadId: string
  squadName: string
}

export function ConeUpload({ reportId, squadId, squadName }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setStatus('error')
      setMessage('Use um arquivo .xlsx ou .xls')
      return
    }
    setStatus('loading')
    setMessage('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('report_id', reportId)
    fd.append('squad_id', squadId)

    const res = await fetch('/api/cone-upload', { method: 'POST', body: fd })
    const data = await res.json()

    if (data.error) {
      setStatus('error')
      setMessage(data.error)
    } else {
      setStatus('ok')
      setMessage(`${data.weeks} semanas importadas`)
      setPreview(data.preview || [])
    }
  }

  return (
    <div className="border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Cone · {squadName}
        </span>
        {status === 'ok' && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle size={11} /> {message}
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={11} /> {message}
          </span>
        )}
        {status === 'loading' && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Loader size={11} className="animate-spin" /> Processando...
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <Upload size={14} className="text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-400">
          {status === 'ok' ? 'Clique para re-importar' : 'Arraste o XLSX do Cone ou clique para selecionar'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-200">
                <th className="text-left pb-1 font-medium">Semana</th>
                <th className="text-right pb-1 font-medium">Entregues</th>
                <th className="text-right pb-1 font-medium">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-0.5 text-gray-500">{p.week}</td>
                  <td className="py-0.5 text-right font-medium text-green-700">{p.throughput}</td>
                  <td className="py-0.5 text-right text-gray-500">{p.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
