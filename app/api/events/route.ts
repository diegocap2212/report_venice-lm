import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { event, action_plans } = body

  const { data: ev, error: evErr } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

  if (action_plans?.length) {
    const plans = action_plans.map((p: any) => ({ ...p, event_id: ev.id }))
    await supabase.from('action_plans').insert(plans)
  }

  const { data: full } = await supabase
    .from('events')
    .select('*, action_plans!action_plans_event_id_fkey(*)')
    .eq('id', ev.id)
    .single()

  return NextResponse.json(full)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
