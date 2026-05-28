'use client'
import { Event, Squad, ConeSnapshot } from '@/types'
import { VazaoChart } from './VazaoChart'
import { EventCard } from './EventCard'

interface Props {
  squad: Squad
  events: Event[]
  snapshots: ConeSnapshot[]
}

export function SquadSection({ squad, events, snapshots }: Props) {
  const squadEvents = events.filter(e => e.squad_id === squad.id)
  const squadSnaps = snapshots.filter(s => s.squad_id === squad.id)
  const latest = squadSnaps[squadSnaps.length - 1]

  const ltP85 = latest?.lead_time_p85
  const remaining = latest?.backlog_remaining
  const totalDelivered = squadSnaps.reduce((s, n) => s + n.throughput, 0)

  const kpiColor = (val: number | undefined, thresholds: [number, number]) => {
    if (!val) return '#0D2240'
    if (val <= thresholds[0]) return '#117A47'
    if (val <= thresholds[1]) return '#B5760A'
    return '#B72C1F'
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Squad header */}
      <div className="bg-[#0D2240] px-5 py-3 flex items-center gap-3">
        <h3 className="text-sm font-medium text-white">{squad.name} · {squad.scope}</h3>
        <span className="text-[11px] text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full">
          SM: {squad.sm?.name || '—'}
        </span>
      </div>

      {/* Body grid: chart + events */}
      <div className="grid grid-cols-[1.6fr_2.4fr]">
        {/* Left: metrics + chart */}
        <div className="p-4 border-r border-gray-100">
          <div className="text-[10px] font-medium tracking-widest uppercase text-gray-400 mb-2">Métricas</div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {ltP85 !== undefined && (
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-400 mb-0.5">Lead Time P85</div>
                <div className="text-lg font-medium leading-none" style={{ color: kpiColor(ltP85, [10, 20]) }}>
                  ~{ltP85}d
                </div>
              </div>
            )}
            {remaining !== undefined && (
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-400 mb-0.5">Restantes</div>
                <div className="text-lg font-medium leading-none" style={{ color: kpiColor(remaining, [10, 20]) }}>
                  {remaining}
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="text-[10px] font-medium tracking-widest uppercase text-gray-400 mb-1.5">
            Vazão por sprint
          </div>
          <div className="bg-gray-50 rounded-lg px-1 py-1">
            <VazaoChart snapshots={snapshots} events={squadEvents} squadId={squad.id} />
          </div>

          {/* Total delivered */}
          {totalDelivered > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-medium text-green-700">{totalDelivered}</span>
              <span className="text-[10px] text-gray-400 leading-tight">itens<br />entregues</span>
            </div>
          )}
        </div>

        {/* Right: events */}
        <div className="p-4">
          <div className="text-[10px] font-medium tracking-widest uppercase text-gray-400 mb-2">
            O que aconteceu · O que está sendo feito
          </div>
          <div className="flex flex-col gap-2">
            {squadEvents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum evento registrado.</p>
            ) : (
              squadEvents.map(ev => <EventCard key={ev.id} event={ev} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
