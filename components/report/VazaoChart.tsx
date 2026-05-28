'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceDot, ResponsiveContainer } from 'recharts'
import { ConeSnapshot, Event } from '@/types'

interface Props {
  snapshots: ConeSnapshot[]
  events: Event[]
  squadId: string
}

export function VazaoChart({ snapshots, events, squadId }: Props) {
  const squadSnaps = snapshots
    .filter(s => s.squad_id === squadId)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))

  if (!squadSnaps.length) return (
    <div className="flex items-center justify-center h-24 text-sm text-gray-400 bg-gray-50 rounded-lg">
      Sem dados de vazão
    </div>
  )

  const max = Math.max(...squadSnaps.map(s => s.throughput), 1)

  // Map events to their sprint_ref weeks
  const eventsByWeek: Record<string, Event[]> = {}
  events
    .filter(e => e.squad_id === squadId && e.sprint_ref)
    .forEach(e => {
      const w = e.sprint_ref!
      if (!eventsByWeek[w]) eventsByWeek[w] = []
      eventsByWeek[w].push(e)
    })

  const data = squadSnaps.map(s => {
    const wk = s.week_start.slice(5).replace('-', '/')
    const label = `${wk.slice(3,5)}/${wk.slice(0,2)}`
    return {
      week: label,
      full: s.week_start,
      throughput: s.throughput,
      remaining: s.backlog_remaining,
      ltP85: s.lead_time_p85,
      events: eventsByWeek[s.week_start] || [],
    }
  })

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.events?.length) return null
    const hasBlocker = payload.events.some((e: Event) => e.type === 'blocker')
    const hasPositive = payload.events.some((e: Event) => e.type === 'throughput_up')
    const color = hasBlocker ? '#B72C1F' : hasPositive ? '#117A47' : '#B5760A'
    return <circle cx={cx} cy={cy - 10} r={4} fill={color} stroke="white" strokeWidth={1.5} />
  }

  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} margin={{ top: 14, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E8E7E3" />
        <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6A6A6A' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#6A6A6A' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '0.5px solid #E8E7E3', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          formatter={(val: any, name: any) => {
            if (name === 'throughput') return [val, 'Entregues']
            return [val, name]
          }}
          labelFormatter={(label: any, payload: any) => {
            const p = payload?.[0]?.payload
            const parts = [`Semana ${label}`]
            if (p?.remaining) parts.push(`Restantes: ${p.remaining}`)
            if (p?.ltP85) parts.push(`LT P85: ${p.ltP85}d`)
            return parts.join(' · ')
          }}
        />
        <Bar dataKey="throughput" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.throughput === 0 ? '#C8C7C2'
                : entry.throughput >= max * 0.7 ? '#117A47'
                : '#0D2240'
              }
            />
          ))}
        </Bar>
        {data.map((entry, i) => (
          entry.events.length > 0 ? (
            <ReferenceDot
              key={i}
              x={entry.week}
              y={entry.throughput}
              r={4}
              fill={
                entry.events.some(e => e.type === 'blocker') ? '#B72C1F'
                : entry.events.some(e => e.type === 'throughput_up') ? '#117A47'
                : '#B5760A'
              }
              stroke="white"
              strokeWidth={1.5}
            />
          ) : null
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
