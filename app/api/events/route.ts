import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { event, action_plans } = body
  const { action_plans: _nestedActionPlans, ...eventPayload } = event || {}

  const { data: ev, error: evErr } = await supabase
    .from('events')
    .insert(eventPayload)
    .select()
    .single()
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

  if (action_plans?.length) {
    const plans = action_plans.map((p: any) => ({ ...p, event_id: ev.id }))
    const { error: apErr } = await supabase.from('action_plans').insert(plans)
    if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 })
  }

  // Fetch action_plans separately to avoid schema cache join issues
  const { data: plans } = await supabase
    .from('action_plans')
    .select('*')
    .eq('event_id', ev.id)

  return NextResponse.json({ ...ev, action_plans: plans || [] })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
