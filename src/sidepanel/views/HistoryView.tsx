import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { useReportsStore } from '@store/reports.store'
import type { Campaign } from '@core/types/campaign.types'
import type { Contact } from '@core/types/contact.types'
import type { TabId } from '@components/layout/Navigation'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TimelineEvent {
  emoji: string
  label: string
  time: string
  type: 'info' | 'success' | 'error'
}

interface CategoryStat {
  cat: string
  count: number
}

interface HistoryRecord {
  id: string
  name: string
  status: 'completed' | 'failed' | 'paused'
  channel: string
  subject: string
  prompt: string
  aiModel: string
  createdAt: string
  completedAt: string
  duration: string
  domains: string[]
  categoriesFound: CategoryStat[]
  contactsFound: number
  avgScore: number
  highScore: number
  lowScore: number
  sent: number
  failed: number
  responded: number
  responseRate: number
  reportsGenerated: number
  timeline: TimelineEvent[]
}

// ── Build HistoryRecord from real Campaign ─────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  journalist: 'Journalist',
  'investigative-reporter': 'Investigative Reporter',
  ngo: 'NGO',
  'legal-advocate': 'Legal Advocate',
  researcher: 'Researcher',
  activist: 'Activist',
}

function campaignToHistory(
  c: Campaign,
  allContacts: Contact[],
  reportCount: number,
): HistoryRecord {
  const contacts = c.contactIds
    .map((id) => allContacts.find((ct) => ct.id === id))
    .filter(Boolean) as Contact[]
  const sentCount = c.messages.filter((m) => m.status === 'sent').length
  const failedCount = c.messages.filter((m) => m.status === 'failed').length
  const scores = contacts.map((ct) => ct.relevanceScore).filter((s) => s > 0)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const catMap = new Map<string, number>()
  contacts.forEach((ct) => {
    const label = CAT_LABELS[ct.category] ?? ct.category
    catMap.set(label, (catMap.get(label) ?? 0) + 1)
  })

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  const start = c.startedAt ?? c.createdAt
  const end = c.completedAt ?? Date.now()
  const durationMs = end - start
  const durationHours = Math.round(durationMs / (1000 * 60 * 60))
  const duration =
    durationMs < 60_000
      ? '< 1m'
      : durationHours < 1
        ? `${Math.round(durationMs / (1000 * 60))}m`
        : durationHours >= 24
          ? `${Math.floor(durationHours / 24)}d ${durationHours % 24}h`
          : `${durationHours}h`

  const firstMsg = c.messages[0]
  const channel =
    firstMsg?.channel === 'professionalMessaging'
      ? 'LinkedIn'
      : firstMsg?.channel === 'contactForm'
        ? 'Web'
        : 'Email'

  const status: HistoryRecord['status'] =
    c.status === 'completed' ? 'completed' : c.status === 'failed' ? 'failed' : 'paused'

  const timeline: TimelineEvent[] = [
    { emoji: '🔍', label: 'Investigation started', time: fmt(c.createdAt), type: 'info' },
    {
      emoji: '👥',
      label: `${contacts.length} contacts discovered`,
      time: fmt(c.createdAt),
      type: 'success',
    },
  ]
  if (c.startedAt)
    timeline.push({ emoji: '📤', label: 'Campaign started', time: fmt(c.startedAt), type: 'info' })
  if (sentCount > 0)
    timeline.push({
      emoji: '✅',
      label: `${sentCount} messages sent`,
      time: fmt(end),
      type: 'success',
    })
  if (failedCount > 0)
    timeline.push({ emoji: '❌', label: `${failedCount} failed`, time: fmt(end), type: 'error' })
  if (c.completedAt)
    timeline.push({
      emoji: '🏁',
      label: 'Campaign completed',
      time: fmt(c.completedAt),
      type: 'success',
    })

  return {
    id: c.id,
    name: c.name,
    status,
    channel,
    subject: firstMsg?.emailSubject ?? '',
    prompt: c.prompt,
    aiModel: 'AI',
    createdAt: fmt(c.createdAt),
    completedAt: fmt(end),
    duration,
    domains: [],
    categoriesFound: Array.from(catMap.entries())
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count),
    contactsFound: contacts.length,
    avgScore,
    highScore: scores.length ? Math.max(...scores) : 0,
    lowScore: scores.length ? Math.min(...scores) : 0,
    sent: sentCount,
    failed: failedCount,
    responded: 0,
    responseRate: sentCount > 0 ? Math.round((0 / sentCount) * 100) : 0,
    reportsGenerated: reportCount,
    timeline,
  }
}

// ── Demo data (shown when store is empty) ──────────────────────────────────────
const DEMO_HISTORY: HistoryRecord[] = [
  {
    id: 'h1',
    name: 'Startups TechIA USA',
    status: 'completed',
    channel: 'Email',
    subject: 'Partnership Opportunity in AI Solutions',
    prompt:
      'Busca empresas de inteligencia artificial en EE.UU. con menos de 200 empleados que estén buscando soluciones de automatización de marketing.',
    aiModel: 'GPT-4o',
    createdAt: '12 Mar 2026',
    completedAt: '14 Mar 2026',
    duration: '2 días, 4 horas',
    domains: ['techcrunch.com', 'crunchbase.com', 'linkedin.com', 'producthunt.com'],
    categoriesFound: [
      { cat: 'SaaS / Software', count: 18 },
      { cat: 'Startup / Venture', count: 12 },
      { cat: 'AI / ML Company', count: 9 },
      { cat: 'Digital Agency', count: 6 },
    ],
    contactsFound: 45,
    avgScore: 82,
    highScore: 97,
    lowScore: 55,
    sent: 38,
    failed: 7,
    responded: 5,
    responseRate: 13,
    reportsGenerated: 2,
    timeline: [
      {
        emoji: '🔍',
        label: 'Investigación iniciada con GPT-4o',
        time: '12 Mar 10:22',
        type: 'info',
      },
      { emoji: '🌐', label: '4 fuentes de datos analizadas', time: '12 Mar 10:34', type: 'info' },
      {
        emoji: '👥',
        label: '45 contactos descubiertos y clasificados',
        time: '12 Mar 11:05',
        type: 'success',
      },
      { emoji: '📤', label: 'Campaña de email iniciada', time: '13 Mar 09:00', type: 'info' },
      {
        emoji: '✅',
        label: '38 mensajes enviados exitosamente',
        time: '14 Mar 12:30',
        type: 'success',
      },
      { emoji: '📩', label: '5 respuestas recibidas', time: '14 Mar 16:45', type: 'success' },
      {
        emoji: '📋',
        label: '2 informes generados y descargados',
        time: '14 Mar 17:00',
        type: 'info',
      },
    ],
  },
  {
    id: 'h2',
    name: 'Agencias Marketing Digital Europa',
    status: 'completed',
    channel: 'LinkedIn',
    subject: 'Colaboración en Automatización de Outreach',
    prompt:
      'Encuentra agencias de marketing digital en Europa (España, Francia, Alemania) con 10–50 empleados que ofrezcan email marketing.',
    aiModel: 'Claude 3.5',
    createdAt: '8 Mar 2026',
    completedAt: '10 Mar 2026',
    duration: '1 día, 16 horas',
    domains: ['linkedin.com', 'clutch.co', 'goodfirms.io'],
    categoriesFound: [
      { cat: 'Marketing Agency', count: 22 },
      { cat: 'Digital Strategy', count: 8 },
      { cat: 'Growth Hacking', count: 5 },
    ],
    contactsFound: 35,
    avgScore: 76,
    highScore: 92,
    lowScore: 51,
    sent: 30,
    failed: 5,
    responded: 8,
    responseRate: 27,
    reportsGenerated: 1,
    timeline: [
      { emoji: '🔍', label: 'Análisis con Claude 3.5 iniciado', time: '8 Mar 14:10', type: 'info' },
      {
        emoji: '🌐',
        label: '3 plataformas profesionales analizadas',
        time: '8 Mar 14:22',
        type: 'info',
      },
      { emoji: '👥', label: '35 contactos descubiertos', time: '8 Mar 15:01', type: 'success' },
      { emoji: '📤', label: 'Mensajes LinkedIn enviados', time: '9 Mar 09:00', type: 'info' },
      {
        emoji: '✅',
        label: '30 mensajes — tasa de respuesta 27%',
        time: '10 Mar 14:00',
        type: 'success',
      },
      { emoji: '📋', label: '1 informe generado', time: '10 Mar 15:30', type: 'info' },
    ],
  },
  {
    id: 'h3',
    name: 'ONGs Latinoamérica',
    status: 'failed',
    channel: 'Email',
    subject: 'Propuesta de Colaboración Digital',
    prompt:
      'Busca ONGs en Latinoamérica que trabajen con tecnología para el desarrollo social y que acepten propuestas de colaboración.',
    aiModel: 'GPT-4o',
    createdAt: '5 Mar 2026',
    completedAt: '6 Mar 2026',
    duration: '22 horas',
    domains: ['ngo-db.com', 'globalgiving.com'],
    categoriesFound: [
      { cat: 'NGO / Non-profit', count: 14 },
      { cat: 'Social Impact', count: 7 },
    ],
    contactsFound: 21,
    avgScore: 68,
    highScore: 85,
    lowScore: 40,
    sent: 8,
    failed: 13,
    responded: 1,
    responseRate: 12,
    reportsGenerated: 0,
    timeline: [
      { emoji: '🔍', label: 'Investigación iniciada', time: '5 Mar 11:00', type: 'info' },
      { emoji: '👥', label: '21 contactos encontrados', time: '5 Mar 11:45', type: 'success' },
      { emoji: '📤', label: 'Envío de emails iniciado', time: '5 Mar 14:00', type: 'info' },
      {
        emoji: '⚠️',
        label: 'Alta tasa de rebote detectada (62%)',
        time: '5 Mar 16:20',
        type: 'error',
      },
      {
        emoji: '❌',
        label: 'Campaña detenida por límite de errores',
        time: '6 Mar 09:00',
        type: 'error',
      },
    ],
  },
]

const STATUS_CFG: Record<HistoryRecord['status'], { label: string; cls: string }> = {
  completed: { label: 'Completada', cls: 'bg-primary/10 text-primary border-primary/30' },
  failed: { label: 'Fallida', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  paused: { label: 'Pausada', cls: 'bg-muted text-muted-foreground border-border' },
}

const CHANNEL_EMOJI: Record<string, string> = { Email: '✉️', LinkedIn: '💼', Web: '🌐' }

// ── Component ──────────────────────────────────────────────────────────────────
interface HistoryViewProps {
  onNavigate: (tab: TabId) => void
}

export function HistoryView({ onNavigate: _ }: HistoryViewProps) {
  const { t } = useTranslation()
  const { campaigns } = useCampaignStore()
  const allContacts = useContactsStore((s) => s.contacts)
  const { reports } = useReportsStore()
  const [open, setOpen] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<Record<string, string>>({})
  const toggle = (id: string) => setOpen((p) => (p === id ? null : id))
  const toggleSection = (rid: string, sec: string) =>
    setActiveSection((p) => ({ ...p, [rid]: p[rid] === sec ? '' : sec }))

  // Build history from real campaigns with status completed/failed/paused, fallback to demo
  const finishedCampaigns = campaigns.filter(
    (c) => c.status === 'completed' || c.status === 'failed' || c.status === 'paused',
  )
  const hasRealData = finishedCampaigns.length > 0
  const HISTORY: HistoryRecord[] = hasRealData
    ? finishedCampaigns.map((c) => {
        const reportsForCampaign = reports.filter((r) => r.campaignId === c.id).length
        return campaignToHistory(c, allContacts, reportsForCampaign)
      })
    : DEMO_HISTORY

  const totalContacts = HISTORY.reduce((s, h) => s + h.contactsFound, 0)
  const totalSent = HISTORY.reduce((s, h) => s + h.sent, 0)
  const completed = HISTORY.filter((h) => h.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">{t('history.title')}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t('history.count', { count: HISTORY.length })}
          </p>
        </div>
        <span className="text-2xl">📚</span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('history.completed'), value: completed, color: 'text-primary' },
          {
            label: t('history.totalContacts'),
            value: totalContacts,
            color: 'text-accent-foreground',
          },
          { label: t('history.totalSent'), value: totalSent, color: 'text-foreground' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
            <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="space-y-3">
        {HISTORY.map((record) => {
          const isOpen = open === record.id
          const cfg = STATUS_CFG[record.status]
          const sec = activeSection[record.id] ?? ''

          return (
            <div
              key={record.id}
              className={`rounded-xl border bg-card overflow-hidden ${
                record.status === 'failed' ? 'border-destructive/20' : 'border-border'
              }`}
            >
              {/* Header row */}
              <div
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isOpen ? 'bg-accent/50' : 'hover:bg-muted/40'
                }`}
                onClick={() => toggle(record.id)}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base shrink-0 mt-0.5">
                  {CHANNEL_EMOJI[record.channel] ?? '📡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold">{record.name}</p>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {record.createdAt} → {record.completedAt} · {record.channel} · {record.duration}
                  </p>
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    <span className="text-muted-foreground">
                      👥{' '}
                      <span className="font-medium text-card-foreground">
                        {record.contactsFound}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      📤 <span className="font-medium text-card-foreground">{record.sent}</span>
                    </span>
                    <span className="text-muted-foreground">
                      📩 <span className="font-medium text-primary">{record.responded}</span>
                    </span>
                    <span className="text-muted-foreground">
                      📋 <span className="font-medium text-primary">{record.reportsGenerated}</span>
                    </span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </div>

              {/* Expanded */}
              {isOpen && (
                <div className="bg-accent/40 border-t border-border">
                  {/* Section pills */}
                  <div className="flex gap-1 px-4 pt-3 pb-1 flex-wrap">
                    {[
                      { id: 'investigation', label: `🔍 ${t('history.investigation')}` },
                      { id: 'contacts', label: `👥 ${t('history.contactsTab')}` },
                      { id: 'outreach', label: `📤 ${t('history.outreach')}` },
                      { id: 'timeline', label: `⏱ ${t('history.timeline')}` },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleSection(record.id, s.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          sec === s.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="px-4 pb-4 pt-2 space-y-3">
                    {sec === '' && (
                      <p className="text-[11px] text-muted-foreground text-center py-3">
                        {t('history.selectSection')}
                      </p>
                    )}

                    {/* ── Investigation ── */}
                    {sec === 'investigation' && (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('history.investigationPrompt')}
                          </p>
                          <p className="text-xs leading-relaxed">{record.prompt}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-border bg-card p-2.5">
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              {t('history.aiModel')}
                            </p>
                            <p className="text-xs font-semibold">🤖 {record.aiModel}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-2.5">
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              {t('history.duration')}
                            </p>
                            <p className="text-xs font-semibold">⏱ {record.duration}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {t('history.sourcesAnalyzed')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {record.domains.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium"
                              >
                                🌐 {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Contacts ── */}
                    {sec === 'contacts' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: t('history.discovered'),
                              value: String(record.contactsFound),
                              color: 'text-accent-foreground',
                            },
                            {
                              label: t('history.avgScoreShort'),
                              value: String(record.avgScore),
                              color: 'text-primary',
                            },
                            {
                              label: t('history.maxScore'),
                              value: String(record.highScore),
                              color: 'text-primary',
                            },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="rounded-lg border border-border bg-card p-2 text-center"
                            >
                              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                              <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                          <div className="px-3 py-2 bg-muted/50 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('history.categoriesFound')}
                            </p>
                          </div>
                          {record.categoriesFound.map((cat, i) => {
                            const pct = Math.round((cat.count / record.contactsFound) * 100)
                            return (
                              <div
                                key={cat.cat}
                                className={`px-3 py-2 ${i < record.categoriesFound.length - 1 ? 'border-b border-border' : ''}`}
                              >
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-medium">{cat.cat}</span>
                                  <span className="text-muted-foreground tabular-nums">
                                    {cat.count} · {pct}%
                                  </span>
                                </div>
                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Outreach ── */}
                    {sec === 'outreach' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              label: t('history.sentLabel'),
                              value: String(record.sent),
                              color: 'text-primary',
                              icon: '✅',
                            },
                            {
                              label: t('history.failedLabel'),
                              value: String(record.failed),
                              color: 'text-destructive',
                              icon: '❌',
                            },
                            {
                              label: t('history.respondedLabel'),
                              value: String(record.responded),
                              color: 'text-accent-foreground',
                              icon: '📩',
                            },
                            {
                              label: t('history.responseRateLabel'),
                              value: `${record.responseRate}%`,
                              color: 'text-primary',
                              icon: '📊',
                            },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="rounded-lg border border-border bg-card p-3"
                            >
                              <p className="text-xl mb-0.5">{s.icon}</p>
                              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                              <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">
                            {t('history.messageSubject')}
                          </p>
                          <p className="text-xs font-medium">"{record.subject}"</p>
                        </div>
                        {record.reportsGenerated > 0 && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <div>
                              <p className="text-xs font-medium">
                                {t('history.reportsGenerated', { count: record.reportsGenerated })}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {t('history.reportsAvailable')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Timeline ── */}
                    {sec === 'timeline' && (
                      <div>
                        {record.timeline.map((event, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                                  event.type === 'success'
                                    ? 'bg-primary/10'
                                    : event.type === 'error'
                                      ? 'bg-destructive/10'
                                      : 'bg-muted'
                                }`}
                              >
                                {event.emoji}
                              </div>
                              {i < record.timeline.length - 1 && (
                                <div className="w-px flex-1 bg-border my-1" />
                              )}
                            </div>
                            <div className="pb-3">
                              <p className="text-xs font-medium">{event.label}</p>
                              <p className="text-[10px] text-muted-foreground">{event.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
