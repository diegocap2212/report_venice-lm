import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function normalizeText(value: any) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
    : ''
}

function parseDateValue(rawDate: any) {
  if (!rawDate) return null
  if (rawDate instanceof Date) {
    return rawDate.toISOString().substring(0, 10)
  }
  if (typeof rawDate === 'string') {
    const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

    const dmyMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (dmyMatch) {
      let [_, d, m, y] = dmyMatch
      if (y.length === 2) {
        const yearNum = parseInt(y, 10)
        y = yearNum >= 50 ? `19${y}` : `20${y}`
      }
      d = d.padStart(2, '0')
      m = m.padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return null
}

function findSheetName(wb: XLSX.WorkBook, squadName: string) {
  const normalizedSquad = normalizeText(squadName)
  const sheets = wb.SheetNames.map(name => ({ name, normalized: normalizeText(name) }))

  const exactMatch = sheets.find(sheet => sheet.normalized === normalizedSquad)
  if (exactMatch) return exactMatch.name

  const o4rMatch = sheets.find(sheet =>
    sheet.normalized.includes(normalizedSquad) && /o4r\d?|baf|cem/.test(sheet.normalized)
  )
  if (o4rMatch) return o4rMatch.name

  const containsMatch = sheets.find(sheet => sheet.normalized.includes(normalizedSquad))
  if (containsMatch) return containsMatch.name

  const headerMatch = sheets.find((sheet) => {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheet.name], { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })
    return rows.some(row =>
      Array.isArray(row) && row.some(cell => normalizeText(cell).includes('semana')) &&
      row.some(cell => normalizeText(cell).includes('realizad'))
    )
  })
  return headerMatch?.name || null
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const reportId = formData.get('report_id') as string
  const squadId = formData.get('squad_id') as string
  const requestedSheet = formData.get('sheet') as string | null

  if (!file || !reportId || !squadId) {
    return NextResponse.json({ error: 'file, report_id e squad_id são obrigatórios' }, { status: 400 })
  }

  const { data: squad, error: squadErr } = await supabase
    .from('squads')
    .select('name')
    .eq('id', squadId)
    .single()

  if (squadErr || !squad) {
    return NextResponse.json({ error: 'Squad não encontrado' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  let sheetName = null
  if (requestedSheet) {
    const match = wb.SheetNames.find(n => normalizeText(n) === normalizeText(requestedSheet) || normalizeText(n).includes(normalizeText(requestedSheet)))
    if (match) sheetName = match
  }
  sheetName = sheetName || findSheetName(wb, squad.name)

  if (!sheetName) {
    return NextResponse.json({ error: `Não foi possível encontrar a aba do time ${squad.name} no arquivo.` }, { status: 400 })
  }

  const ws = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })

  // Define keywords for all 10 metrics
  const realizedKeywords = ['realizad', 'realizado', 'desenv', 'desenvolv', 'conclu', 'concluido', 'desenv concluido', 'desenvconcluido']
  const backlogKeywords = ['a fazer', 'afazer', 'a_fazer', 'a-fazer', 'fazer', 'estoque']
  const leadTimeKeywords = ['lead', 'lt', 'p85', 'p 85', 'percentil']
  const wipKeywords = ['wip', 'em progresso', 'andamento', 'emandamento']
  const plannedKeywords = ['planejad', 'planejado', 'sprint']
  const unplannedKeywords = ['nao planejad', 'naoplanejad', 'ad hoc', 'adhoc', 'fora sprint']
  const bugsKeywords = ['bug', 'fura', 'fura fila', 'furafila', 'urgente']
  const newKeywords = ['novo', 'novos', 'nova', 'novos itens']
  const discardedKeywords = ['descartad', 'descartado', 'cancelad', 'cancelado']

  const headerRowIndex = rows.findIndex(row =>
    Array.isArray(row) &&
    row.some(cell => normalizeText(cell).includes('semana')) &&
    row.some(cell => realizedKeywords.some(k => normalizeText(cell).includes(k)))
  )

  if (headerRowIndex === -1) {
    return NextResponse.json({ error: 'Cabeçalho inválido. Não foi possível localizar a linha de colunas esperadas.' }, { status: 400 })
  }

  const header = rows[headerRowIndex].map(normalizeText)
  
  // Helper function to find column by keywords
  const findColumnByKeywords = (keywordList: string[]): number => {
    return header.findIndex(text => keywordList.some(k => text.includes(k)))
  }

  const dateCol = header.findIndex(text => text.includes('semana'))
  const realizedCol = findColumnByKeywords(realizedKeywords)
  let backlogCol = findColumnByKeywords(backlogKeywords)
  const leadTimeCol = findColumnByKeywords(leadTimeKeywords)
  const wipCol = findColumnByKeywords(wipKeywords)
  const plannedCol = findColumnByKeywords(plannedKeywords)
  const unplannedCol = findColumnByKeywords(unplannedKeywords)
  const bugsCol = findColumnByKeywords(bugsKeywords)
  const newCol = findColumnByKeywords(newKeywords)
  const discardedCol = findColumnByKeywords(discardedKeywords)

  // fallback: if backlog not found, try common alternatives near date column
  if (backlogCol === -1) {
    for (let offset = 1; offset <= 3; offset++) {
      const idx = dateCol + offset
      if (idx >= 0 && idx < header.length) {
        const val = header[idx]
        if (!val) continue
        if (val.length < 20 || /a fazer|afazer|estoque|backlog|fazer/.test(val)) {
          backlogCol = idx
          break
        }
      }
    }
  }

  if (dateCol === -1 || realizedCol === -1) {
    return NextResponse.json({ error: 'As colunas esperadas não foram encontradas. Verifique a formatação do arquivo.' }, { status: 400 })
  }

  // Helper function to safely parse numeric values
  const parseNumericValue = (value: any): number => {
    if (typeof value === 'number') return Math.round(value)
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'))
      return isNaN(parsed) ? 0 : Math.round(parsed)
    }
    return 0
  }

  const snapshots: any[] = []

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue

    const rawDate = row[dateCol]
    const weekStart = parseDateValue(rawDate)
    if (!weekStart) continue

    const snapshot: any = {
      squad_id: squadId,
      report_id: reportId,
      week_start: weekStart,
      throughput: parseNumericValue(row[realizedCol]),
      backlog_remaining: parseNumericValue(row[backlogCol]),
    }

    // Add optional fields if columns were found
    if (leadTimeCol >= 0) snapshot.lead_time_p85 = parseNumericValue(row[leadTimeCol])
    if (wipCol >= 0) snapshot.wip = parseNumericValue(row[wipCol])
    if (plannedCol >= 0) snapshot.items_planned = parseNumericValue(row[plannedCol])
    if (unplannedCol >= 0) snapshot.items_unplanned = parseNumericValue(row[unplannedCol])
    if (bugsCol >= 0) snapshot.items_bugs = parseNumericValue(row[bugsCol])
    if (newCol >= 0) snapshot.items_new = parseNumericValue(row[newCol])
    if (discardedCol >= 0) snapshot.items_discarded = parseNumericValue(row[discardedCol])

    snapshots.push(snapshot)
  }

  if (snapshots.length === 0) {
    return NextResponse.json({ error: 'Nenhum dado encontrado no arquivo. Verifique se é a aba correta do Cone.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('cone_snapshots')
    .upsert(snapshots, { onConflict: 'squad_id,report_id,week_start' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    sheet: sheetName,
    weeks: snapshots.length,
    columnsDetected: {
      date: dateCol >= 0,
      throughput: realizedCol >= 0,
      backlog: backlogCol >= 0,
      leadTime: leadTimeCol >= 0,
      wip: wipCol >= 0,
      planned: plannedCol >= 0,
      unplanned: unplannedCol >= 0,
      bugs: bugsCol >= 0,
      new: newCol >= 0,
      discarded: discardedCol >= 0,
    },
    preview: snapshots.slice(-6).map(s => ({
      week: s.week_start,
      throughput: s.throughput,
      remaining: s.backlog_remaining,
      lead_time_p85: s.lead_time_p85,
      wip: s.wip,
      items_planned: s.items_planned,
      items_unplanned: s.items_unplanned,
      items_bugs: s.items_bugs,
    }))
  })
}
