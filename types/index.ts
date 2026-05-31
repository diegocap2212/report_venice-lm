export type EventType = 'throughput_up' | 'lead_time_impact' | 'blocker' | 'future' | 'context'
export type ActionStatus = 'planned' | 'in_progress' | 'done'
export type ReportStatus = 'draft' | 'published'

export interface SM {
  id: string
  name: string
  email: string
}

export interface Squad {
  id: string
  name: string
  scope: string
  sm_id: string
  sm?: SM
  cone_sheet_name?: string
}

export interface Report {
  id: string
  period_label: string
  period_start: string
  period_end: string
  status: ReportStatus
  slug: string
  published_at?: string
  created_at: string
}

export interface Event {
  id: string
  report_id: string
  squad_id: string
  type: EventType
  text: string
  sprint_ref?: string
  affects_throughput: boolean
  affects_lead_time: boolean
  sort_order: number
  action_plans?: ActionPlan[]
}

export interface ActionPlan {
  id: string
  event_id: string
  owner: string
  action: string
  due_date?: string
  status: ActionStatus
}

export interface ConeSnapshot {
  id: string
  squad_id: string
  report_id: string
  week_start: string
  throughput: number
  backlog_remaining: number
  lead_time_p85?: number
  wip?: number
  items_planned?: number
  items_unplanned?: number
  items_bugs?: number
  items_new?: number
  items_discarded?: number
  created_at?: string
  updated_at?: string
}

export const EVENT_CONFIG: Record<EventType, {
  label: string
  shortLabel: string
  color: string
  bg: string
  border: string
  icon: string
  requiresAction: boolean
}> = {
  throughput_up: {
    label: 'Impacto positivo na vazão',
    shortLabel: '↑ vazão',
    color: '#117A47',
    bg: '#EAF6EF',
    border: '#b8dfc8',
    icon: 'TrendingUp',
    requiresAction: false,
  },
  lead_time_impact: {
    label: 'Impacto no Lead Time',
    shortLabel: '↑ lead time',
    color: '#B5760A',
    bg: '#FDF6E8',
    border: '#e8d4a0',
    icon: 'Clock',
    requiresAction: false,
  },
  blocker: {
    label: 'Bloqueio / Risco ativo',
    shortLabel: '↓ bloqueio',
    color: '#B72C1F',
    bg: '#FCEEED',
    border: '#f0bfbc',
    icon: 'AlertCircle',
    requiresAction: true,
  },
  future: {
    label: 'Próximas sprints',
    shortLabel: '→ futuro',
    color: '#0D2240',
    bg: '#E6EAF0',
    border: '#b8c4d8',
    icon: 'ArrowRight',
    requiresAction: true,
  },
  context: {
    label: 'Contexto / Evolução',
    shortLabel: 'contexto',
    color: '#6A6A6A',
    bg: '#F0EFEB',
    border: '#d0cfcb',
    icon: 'Info',
    requiresAction: false,
  },
}

export const ACTION_STATUS_CONFIG: Record<ActionStatus, {
  label: string
  color: string
  bg: string
}> = {
  planned:     { label: 'Planejado',    color: '#6A6A6A', bg: '#F0EFEB' },
  in_progress: { label: 'Em andamento', color: '#185FA5', bg: '#E6F1FB' },
  done:        { label: 'Feito',        color: '#117A47', bg: '#EAF6EF' },
}
