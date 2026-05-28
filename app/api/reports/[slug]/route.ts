import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { data: report, error: rErr } = await supabase
    .from('reports')
    .select('*')
    .eq('slug', slug)
    .single()
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 404 })

  const { data: events } = await supabase
    .from('events')
    .select('*, action_plans!action_plans_event_id_fkey(*), squad:squads(*, sm:sms(*))')
    .eq('report_id', report.id)
    .order('sort_order')

  const { data: snapshots } = await supabase
    .from('cone_snapshots')
    .select('*')
    .eq('report_id', report.id)
    .order('week_start')

  return NextResponse.json({ report, events: events || [], snapshots: snapshots || [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await req.json()
  const { data, error } = await supabase
    .from('reports')
    .update(body)
    .eq('slug', slug)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
