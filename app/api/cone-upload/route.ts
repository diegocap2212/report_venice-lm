import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const reportId = formData.get('report_id') as string
  const squadId = formData.get('squad_id') as string

  if (!file || !reportId || !squadId) {
    return NextResponse.json({ error: 'file, report_id e squad_id são obrigatórios' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  // Find the relevant sheet - use first sheet or match squad name
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })

  // Extract throughput data from the sheet
  // Look for rows with dates and numeric realizado values
  const snapshots: any[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Column B = date (index 1), Column J = realizado (index 9), Column C = afazer (index 2)
    const rawDate = row[1]
    const realizado = row[9]
    const afazer = row[2]

    if (!rawDate || realizado === undefined) continue

    // Parse date
    let weekStart: string | null = null
    if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      weekStart = rawDate.substring(0, 10)
    } else if (rawDate instanceof Date) {
      weekStart = rawDate.toISOString().substring(0, 10)
    }

    if (!weekStart) continue

    const throughput = typeof realizado === 'number' ? realizado :
      typeof realizado === 'string' ? parseFloat(realizado) || 0 : 0
    const backlogRemaining = typeof afazer === 'number' ? afazer :
      typeof afazer === 'string' ? parseFloat(afazer) || 0 : 0

    // Only include rows from 2026
    if (!weekStart.startsWith('2026')) continue

    snapshots.push({
      squad_id: squadId,
      report_id: reportId,
      week_start: weekStart,
      throughput: Math.round(throughput),
      backlog_remaining: Math.round(backlogRemaining),
    })
  }

  if (snapshots.length === 0) {
    return NextResponse.json({ error: 'Nenhum dado encontrado no arquivo. Verifique se é a aba correta do Cone.' }, { status: 400 })
  }

  // Upsert snapshots
  const { error } = await supabase
    .from('cone_snapshots')
    .upsert(snapshots, { onConflict: 'squad_id,report_id,week_start' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    weeks: snapshots.length,
    preview: snapshots.slice(-6).map(s => ({
      week: s.week_start,
      throughput: s.throughput,
      remaining: s.backlog_remaining
    }))
  })
}
