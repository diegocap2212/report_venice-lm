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

  // Fetch events without join
  const { data: events } = await supabase
    .from('events')
    .select('*, squad:squads(*, sm:sms(*))')
    .eq('report_id', report.id)
    .order('sort_order')

  // Fetch action_plans separately
  const eventIds = (events || []).map((e: any) => e.id)
  let actionPlans: any[] = []
  if (eventIds.length > 0) {
    const { data: plans } = await supabase
      .from('action_plans')
      .select('*')
      .in('event_id', eventIds)
    actionPlans = plans || []
  }

  // Attach action_plans to each event
  const eventsWithPlans = (events || []).map((e: any) => ({
    ...e,
    action_plans: actionPlans.filter((p: any) => p.event_id === e.id)
  }))

  const { data: snapshots } = await supabase
    .from('cone_snapshots')
    .select('*')
    .eq('report_id', report.id)
    .order('week_start')

  return NextResponse.json({
    report,
    events: eventsWithPlans,
    snapshots: snapshots || []
  })
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
