'use client'
import { Event, ActionPlan, EVENT_CONFIG, ACTION_STATUS_CONFIG } from '@/types'
import { TrendingUp, Clock, AlertCircle, ArrowRight, Info, Wrench, Check } from 'lucide-react'

const ICONS: Record<string, any> = { TrendingUp, Clock, AlertCircle, ArrowRight, Info }

interface Props {
  event: Event
}

export function EventCard({ event }: Props) {
  const cfg = EVENT_CONFIG[event.type]
  const Icon = ICONS[cfg.icon]
  const plans = event.action_plans || []

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ borderColor: cfg.border }}
    >
      {/* Event body */}
      <div className="flex gap-2 px-3 py-2.5" style={{ background: cfg.bg }}>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: cfg.color }}
        >
          <Icon size={11} color="white" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium tracking-wide uppercase mb-0.5" style={{ color: cfg.color }}>
            {cfg.label}
          </div>
          <div className="text-[11.5px] leading-snug text-gray-600">{event.text}</div>
          {event.sprint_ref && (
            <span className="inline-flex items-center gap-1 mt-1 text-[9.5px] font-medium bg-black/5 rounded px-1.5 py-0.5 text-gray-500">
              {event.sprint_ref}
            </span>
          )}
          {(event.affects_throughput || event.affects_lead_time) && (
            <div className="flex gap-1 mt-1.5">
              {event.affects_throughput && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#EAF6EF', color: '#117A47' }}>
                  impacta vazão
                </span>
              )}
              {event.affects_lead_time && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#FDF6E8', color: '#B5760A' }}>
                  impacta lead time
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action plans */}
      {plans.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-t border-dashed" style={{ borderColor: cfg.border }}>
          <div className="flex items-center gap-1.5 text-[9px] font-medium tracking-wide uppercase text-gray-400 mb-2">
            <Wrench size={9} />
            Plano de ação
          </div>
          <div className="flex flex-col gap-1.5">
            {plans.map((plan) => {
              const sc = ACTION_STATUS_CONFIG[plan.status]
              return (
                <div key={plan.id} className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{ background: '#E6EAF0', color: '#0D2240' }}
                  >
                    {plan.owner}
                  </span>
                  <span className="flex-1 min-w-0">{plan.action}</span>
                  <span
                    className="text-[9.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    {plan.status === 'done' && <Check size={8} />}
                    {sc.label}
                    {plan.due_date && plan.status !== 'done' && (
                      <span className="opacity-60"> · {plan.due_date.slice(5).replace('-', '/')}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
