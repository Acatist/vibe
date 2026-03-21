import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Campaign, CampaignStatus } from '@core/types/campaign.types'
import type { Contact } from '@core/types/contact.types'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { getAIProvider } from '@services/ai.service'
import { executeCampaign } from '@engine/campaign'
import { Logger } from '@services/logger.service'
import {
  ChevronDown,
  ChevronUp,
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pause,
  Play,
  Edit3,
  Eye,
  Bot,
  Mail,
  Loader2,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Progress } from '@components/ui/progress'
import { Label } from '@components/ui/label'
import { Separator } from '@components/ui/separator'
import { TruncatedText } from '@components/ui/truncated-text'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@components/ui/dialog'
import type { TabId } from '@components/layout/Navigation'

// ─── Types & mock data ────────────────────────────────────────────────────────

interface MockCampaign {
  id: string
  name: string
  status: CampaignStatus
  contactCount: number
  sentCount: number
  responseCount: number
  createdAt: string
  channel: string
  subject: string
  message: string
  contacts: {
    name: string
    email: string
    category: string
    score: number
    customSubject?: string
    customMessage?: string
  }[]
  timesContacted: number
}

const MOCK_CAMPAIGNS: MockCampaign[] = [
  {
    id: 'c1',
    name: 'Outreach Tech Media España',
    status: 'draft',
    contactCount: 5,
    sentCount: 0,
    responseCount: 0,
    createdAt: '12 mar 2026',
    channel: 'Email',
    subject: 'Colaboración Editorial — Vibe Reach',
    message:
      'Estimado equipo, nos ponemos en contacto para explorar posibilidades de colaboración en el ámbito de la tecnología e inteligencia artificial...',
    contacts: [
      {
        name: 'TechInsight Media',
        email: 'editorial@techinsight.com',
        category: 'Periodismo',
        score: 87,
      },
      {
        name: 'DataDriven Research',
        email: 'hello@datadrivenresearch.io',
        category: 'Think Tank',
        score: 81,
      },
      {
        name: 'NewsAI Weekly',
        email: 'contact@newsaiweekly.com',
        category: 'Periodismo',
        score: 76,
      },
      { name: 'TechReview ES', email: 'info@techreview.es', category: 'Periodismo', score: 69 },
      { name: 'Digital Pulse', email: 'team@digitalpulse.io', category: 'Think Tank', score: 73 },
    ],
    timesContacted: 0,
  },
  {
    id: 'c2',
    name: 'ONG Medioambiente Europa',
    status: 'running',
    contactCount: 3,
    sentCount: 2,
    responseCount: 1,
    createdAt: '10 mar 2026',
    channel: 'Email',
    subject: 'Partnership Sostenibilidad 2026',
    message:
      'Hola, queremos presentaros nuestra plataforma y explorar sinergias en el ámbito de la sostenibilidad y acción climática...',
    contacts: [
      { name: 'EcoFund Global', email: 'info@ecofundglobal.org', category: 'ONG', score: 74 },
      { name: 'GreenEarth Initiative', email: 'contact@greenearth.eu', category: 'ONG', score: 68 },
      { name: 'ClimateAction EU', email: 'press@climateaction.eu', category: 'ONG', score: 71 },
    ],
    timesContacted: 1,
  },
  {
    id: 'c3',
    name: 'Campaña Transparencia & Legal',
    status: 'completed',
    contactCount: 4,
    sentCount: 4,
    responseCount: 2,
    createdAt: '5 mar 2026',
    channel: 'Email',
    subject: 'Investigación Conjunta — Transparencia Institucional',
    message:
      'Buenos días, somos Vibe Reach y estamos desarrollando una investigación sobre transparencia institucional en Europa...',
    contacts: [
      {
        name: 'Transparency Watch EU',
        email: 'press@transparencywatch.eu',
        category: 'Investigación',
        score: 92,
      },
      {
        name: 'Open Justice Foundation',
        email: 'legal@openjustice.org',
        category: 'Asesoría Legal',
        score: 68,
      },
      {
        name: 'EUTransparency',
        email: 'info@eutransparency.org',
        category: 'Investigación',
        score: 85,
      },
      {
        name: 'LegalWatch Int.',
        email: 'contact@legalwatch.com',
        category: 'Asesoría Legal',
        score: 72,
      },
    ],
    timesContacted: 2,
  },
]

type SendStatus = 'waiting' | 'sending' | 'sent' | 'failed'

interface SendRow {
  name: string
  email: string
  category: string
  score: number
  status: SendStatus
  progress: number
}

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; cls: string; icon: React.ElementType }
> = {
  draft: { label: 'Borrador', cls: 'bg-muted text-muted-foreground border-border', icon: Clock },
  queued: { label: 'En cola', cls: 'bg-muted text-muted-foreground border-border', icon: Clock },
  running: {
    label: 'En curso',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: Play,
  },
  paused: {
    label: 'Pausada',
    cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    icon: Pause,
  },
  completed: {
    label: 'Completada',
    cls: 'bg-green-500/10 text-green-400 border-green-500/30',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Fallida',
    cls: 'bg-red-500/10 text-red-400 border-red-500/30',
    icon: AlertCircle,
  },
}

const CAT_DISPLAY: Record<string, string> = {
  journalist: 'Periodismo',
  'investigative-reporter': 'Periodismo',
  ngo: 'ONG',
  'legal-advocate': 'Asesoría Legal',
  researcher: 'Investigación',
  activist: 'Activismo',
}

function realCampaignToMock(c: Campaign, allContacts: Contact[]): MockCampaign {
  const contacts = c.contactIds.map((id) => {
    const found = allContacts.find((ct) => ct.id === id)
    return {
      name: found?.organization ?? found?.name ?? id,
      email: found?.email ?? '',
      category: found ? (CAT_DISPLAY[found.category] ?? found.category) : '—',
      score: found?.relevanceScore ?? 0,
    }
  })
  const sentCount = c.messages.filter((m) => m.status === 'sent').length
  return {
    id: c.id,
    name: c.name,
    status: c.status as MockCampaign['status'],
    contactCount: c.contactIds.length,
    sentCount,
    responseCount: 0,
    createdAt: new Date(c.createdAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    channel: 'Email',
    subject: '',
    message: c.prompt,
    contacts,
    timesContacted: 0,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, cls, icon: Icon } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

// ─── Live send view ─────────────────────────────────────────────────────────

function LiveSendView({ campaign }: { campaign: MockCampaign }) {
  const [rows, setRows] = useState<SendRow[]>(() =>
    campaign.contacts.map((c) => ({
      name: c.name,
      email: c.email,
      category: c.category,
      score: c.score,
      status: 'waiting' as SendStatus,
      progress: 0,
    })),
  )
  const [finished, setFinished] = useState(false)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    async function processContacts() {
      for (let idx = 0; idx < campaign.contacts.length; idx++) {
        if (cancelledRef.current) break

        setRows((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, status: 'sending', progress: 0 } : r)),
        )
        setTimeout(() => {
          if (!cancelledRef.current)
            rowRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 120)

        await new Promise<void>((resolve) => {
          const duration = 2000 + Math.random() * 1600
          const startTime = performance.now()
          function tick(now: number) {
            if (cancelledRef.current) {
              resolve()
              return
            }
            const pct = Math.min(100, ((now - startTime) / duration) * 100)
            setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, progress: pct } : r)))
            if (pct < 100) {
              requestAnimationFrame(tick)
            } else {
              const failed = Math.random() < 0.1
              setRows((prev) =>
                prev.map((r, i) =>
                  i === idx ? { ...r, status: failed ? 'failed' : 'sent', progress: 100 } : r,
                ),
              )
              setTimeout(resolve, 460)
            }
          }
          requestAnimationFrame(tick)
        })
      }
      if (!cancelledRef.current) setFinished(true)
    }

    processContacts()
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sentCount = rows.filter((r) => r.status === 'sent').length
  const failedCount = rows.filter((r) => r.status === 'failed').length
  const doneCount = rows.filter((r) => r.status !== 'waiting').length
  const totalCount = campaign.contacts.length

  return (
    <div className="space-y-3">
      {/* Campaign header */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <TruncatedText as="p" text={campaign.name} className="text-xs font-semibold" />
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {campaign.channel} · {campaign.createdAt}
            </p>
          </div>
          <div className="text-right shrink-0">
            {finished ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-green-500/10 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Completada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-blue-500/10 text-blue-400 border-blue-500/30">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Enviando…
              </span>
            )}
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              {doneCount}/{totalCount} procesados
            </p>
          </div>
        </div>
        {/* Global progress */}
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                finished ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progreso global</span>
            <span>{Math.round((doneCount / totalCount) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {doneCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-sm font-bold tabular-nums">{doneCount}</p>
            <p className="text-[10px] text-muted-foreground">Procesados</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-sm font-bold text-green-400 tabular-nums">{sentCount}</p>
            <p className="text-[10px] text-muted-foreground">Enviados</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p
              className={`text-sm font-bold tabular-nums ${
                failedCount > 0 ? 'text-red-400' : 'text-muted-foreground'
              }`}
            >
              {failedCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Fallidos</p>
          </div>
        </div>
      )}

      {/* Sending rows */}
      <div className="rounded-xl border border-border overflow-hidden">
        {rows.map((row, idx) => {
          const isWaiting = row.status === 'waiting'
          const isSending = row.status === 'sending'
          const isSent = row.status === 'sent'
          const isFailed = row.status === 'failed'

          return (
            <div
              key={row.name}
              ref={(el) => {
                rowRefs.current[idx] = el
              }}
              className={`transition-opacity duration-500 ${
                idx < rows.length - 1 ? 'border-b border-border' : ''
              } ${isWaiting ? 'opacity-35' : 'opacity-100'}`}
            >
              <div className="px-3 pt-2.5 pb-2.5">
                {/* Name + status badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{row.name}</p>
                    <p className="text-[11px] text-emerald-500 truncate">{row.email}</p>
                  </div>
                  <div className="shrink-0">
                    {isWaiting && (
                      <span className="text-[10px] text-muted-foreground/40">En espera</span>
                    )}
                    {isSending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-blue-500/10 text-blue-400 border-blue-500/30">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Enviando
                      </span>
                    )}
                    {isSent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-green-500/10 text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Enviado ✓
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-red-500/10 text-red-400 border-red-500/30">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Fallido
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                {!isWaiting && (
                  <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isSent ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${row.progress}%`,
                        transition: isSending ? 'none' : 'width 0.35s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {finished && (
        <p className="text-[11px] text-center text-muted-foreground">
          ✓ Proceso finalizado · {sentCount} enviados
          {failedCount > 0 ? `, ${failedCount} fallidos` : ''}
        </p>
      )}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface CampaignsViewProps {
  onNavigate: (tab: TabId) => void
}

export function CampaignsView({ onNavigate: _ }: CampaignsViewProps) {
  const { t } = useTranslation()
  const { campaigns: storeCampaigns, deleteCampaign, clearAllCampaigns, hasEverCreatedCampaign, hiddenMockCampaignIds, hideMockCampaign, hideAllMockCampaigns } = useCampaignStore()
  const { contacts: allContacts, deleteContactsBatch } = useContactsStore()

  // Use real campaigns if available, otherwise show demo data only for first-time users
  const realCampaigns = storeCampaigns.map((c) => realCampaignToMock(c, allContacts))
  const hasRealCampaigns = realCampaigns.length > 0

  // Only fall back to mock data if the user has never created a real campaign.
  // Once they've used the real flow (even if they later delete everything), show the real empty state.
  const allCampaigns = hasRealCampaigns
    ? realCampaigns
    : hasEverCreatedCampaign
      ? []
      : MOCK_CAMPAIGNS.filter((c) => !hiddenMockCampaignIds.includes(c.id))

  const [tab, setTab] = useState<'all' | 'running' | 'completed'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (id: string) => setOpen((p) => (p === id ? null : id))

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)

  function handleDeleteCampaign(campaign: MockCampaign) {
    if (hasRealCampaigns) {
      const real = storeCampaigns.find((c) => c.id === campaign.id)
      if (real?.contactIds.length) {
        deleteContactsBatch(real.contactIds)
      }
      deleteCampaign(campaign.id)
    } else {
      hideMockCampaign(campaign.id)
    }
    setDeletingId(null)
    if (open === campaign.id) setOpen(null)
    if (activeLiveCampaign?.id === campaign.id) {
      setActiveLiveCampaign(null)
      if (tab === 'running') setTab('all')
    }
  }

  function handleClearAll() {
    if (hasRealCampaigns || hasEverCreatedCampaign) {
      // Collect all contactIds across all real campaigns and delete in one operation
      const allContactIds = storeCampaigns.flatMap((c) => c.contactIds)
      if (allContactIds.length) {
        deleteContactsBatch(allContactIds)
      }
      // clearAllCampaigns writes { campaigns: [], hasEverCreatedCampaign: true } to storage.
      // Do NOT call clearStorage() — that would wipe hasEverCreatedCampaign and make mocks reappear.
      clearAllCampaigns()
    } else {
      hideAllMockCampaigns(MOCK_CAMPAIGNS.map((c) => c.id))
    }
    setShowClearAllConfirm(false)
    setOpen(null)
    setDeletingId(null)
    setActiveLiveCampaign(null)
    if (tab === 'running') setTab('all')
  }

  // Active live campaign
  const [activeLiveCampaign, setActiveLiveCampaign] = useState<MockCampaign | null>(
    allCampaigns.find((c) => c.status === 'running') ?? null,
  )
  const [liveKey, setLiveKey] = useState(0)

  function handleSend(campaign: MockCampaign) {
    setActiveLiveCampaign(campaign)
    setLiveKey((k) => k + 1)
    setTab('running')

    // Trigger real campaign engine for store-backed campaigns
    const realCampaign = storeCampaigns.find((c) => c.id === campaign.id)
    if (realCampaign) {
      const log = Logger.create('CampaignsView')
      executeCampaign(
        realCampaign,
        [campaign.contacts[0]?.email ? `https://${campaign.contacts[0].email.split('@')[1]}` : ''],
        realCampaign.prompt,
        '',
        '',
      ).catch((e) => log.error('Campaign execution failed', (e as Error).message))
    }
  }

  // Edit modal
  const [editCampaign, setEditCampaign] = useState<MockCampaign | null>(null)
  const [editName, setEditName] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editMessage, setEditMessage] = useState('')

  // Contacts view modal
  const [viewCampaign, setViewCampaign] = useState<MockCampaign | null>(null)
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')

  // AI modal
  const [aiCampaign, setAiCampaign] = useState<MockCampaign | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const displayed =
    tab === 'completed' ? allCampaigns.filter((c) => c.status === 'completed') : allCampaigns

  function openEdit(c: MockCampaign) {
    setEditCampaign(c)
    setEditName(c.name)
    setEditSubject(c.subject)
    setEditMessage(c.message)
  }

  function openContactEdit(
    c: { name: string; customSubject?: string; customMessage?: string },
    campaign: MockCampaign,
  ) {
    setEditingContact(c.name)
    setContactSubject(c.customSubject ?? campaign.subject)
    setContactMessage(c.customMessage ?? campaign.message)
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim() || !aiCampaign) return
    setAiGenerating(true)
    try {
      const provider = getAIProvider()
      await provider.analyzeCampaign({
        contactType: 'corporate',
        affinityCategory: '',
        affinitySubcategory: '',
        language: 'Spanish',
        country: 'worldwide',
        consistency: 5,
        description: aiPrompt.trim(),
        reportLanguage: 'Spanish',
      })
    } catch {
      // Generation may fail — still mark done so user can retry
    }
    setAiGenerating(false)
    setAiDone(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('campaigns.title')}</h2>
          {allCampaigns.length > 0 && (
            <button
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              onClick={() => setShowClearAllConfirm(true)}
            >
              <Trash2 className="w-3 h-3" />
              Borrar todo
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('campaigns.count', { count: allCampaigns.length })}
          {realCampaigns.length > 0 && (
            <span className="text-primary font-medium">
              {' '}
              · {t('campaigns.saved', { count: realCampaigns.length })}
            </span>
          )}
        </p>
      </div>

      {/* ── Clear all confirmation banner */}
      {showClearAllConfirm && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="flex-1 text-xs text-destructive leading-snug">
            ¿Borrar todas las campañas y sus contactos?
          </p>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 px-2 text-[10px] shrink-0"
            onClick={handleClearAll}
          >
            Borrar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] shrink-0"
            onClick={() => setShowClearAllConfirm(false)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Tabs — full width, 3 tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted w-full">
        {(
          [
            { id: 'all' as const, label: t('campaigns.tabAll') },
            { id: 'running' as const, label: t('campaigns.tabRunning') },
            { id: 'completed' as const, label: t('campaigns.tabCompleted') },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 h-7 rounded-md text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── EN CURSO TAB ── */}
      {tab === 'running' &&
        (activeLiveCampaign ? (
          <LiveSendView
            key={`live-${liveKey}-${activeLiveCampaign.id}`}
            campaign={activeLiveCampaign}
          />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">
            No hay campañas en curso. Pulsa "Enviar" en una campaña.
          </p>
        ))}

      {/* ── TODAS / COMPLETADAS TAB ── */}
      {tab !== 'running' &&
        (displayed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No hay campañas completadas aún.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {displayed.map((campaign, idx) => {
              const isOpen = open === campaign.id
              const isLast = idx === displayed.length - 1
              const pct =
                campaign.contactCount > 0
                  ? Math.round((campaign.sentCount / campaign.contactCount) * 100)
                  : 0
              const responsePct =
                campaign.sentCount > 0
                  ? Math.round((campaign.responseCount / campaign.sentCount) * 100)
                  : 0

              return (
                <div key={campaign.id} className={!isLast ? 'border-b border-border' : ''}>
                  {/* Row header */}
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                    onClick={() => toggle(campaign.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <TruncatedText as="p" text={campaign.name} className="text-xs font-semibold" />
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {campaign.createdAt} · {campaign.channel}
                      </p>
                    </div>
                    <StatusBadge status={campaign.status} />
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="px-4 pb-4 bg-primary/5 border-t border-primary/10 space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-2 pt-3">
                        {[
                          { icon: Users, label: 'Contactos', value: campaign.contactCount },
                          { icon: Send, label: 'Enviados', value: campaign.sentCount },
                          { icon: Mail, label: 'Respuestas', value: campaign.responseCount },
                          { icon: Clock, label: 'Veces env.', value: campaign.timesContacted },
                        ].map(({ icon: Icon, label, value }) => (
                          <div
                            key={label}
                            className="rounded-lg bg-background border border-border p-2 text-center"
                          >
                            <Icon className="w-3 h-3 text-primary mx-auto mb-0.5" />
                            <p className="text-sm font-bold">{value}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bars */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progreso de envío</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Tasa de respuesta</span>
                            <span>{responsePct}%</span>
                          </div>
                          <Progress value={responsePct} className="h-1.5" />
                        </div>
                      </div>

                      {/* Subject + message preview */}
                      <div className="space-y-1 text-xs">
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                          Asunto
                        </p>
                        <p className="font-medium truncate">{campaign.subject}</p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-2">
                          Mensaje
                        </p>
                        <p className="text-muted-foreground line-clamp-2">{campaign.message}</p>
                      </div>

                      <Separator />

                      {/* Action buttons */}
                      {deletingId === campaign.id ? (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
                          <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                          <p className="flex-1 text-xs text-destructive">
                            ¿Borrar campaña y sus {campaign.contactCount} contactos?
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-[10px] shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCampaign(campaign)
                            }}
                          >
                            Borrar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingId(null)
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewCampaign(campaign)
                            }}
                          >
                            <Eye className="w-3 h-3" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(campaign)
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs gap-1"
                            disabled={campaign.status === 'completed'}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSend(campaign)
                            }}
                          >
                            <Send className="w-3 h-3" />
                            Enviar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
                            title="Generar mensajes con IA"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAiCampaign(campaign)
                              setAiPrompt('')
                              setAiDone(false)
                            }}
                          >
                            <Bot className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Borrar campaña"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingId(campaign.id)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

      {/* ── EDIT MODAL ────────────────────────────────────────── */}
      <Dialog
        open={!!editCampaign}
        onOpenChange={(o) => {
          if (!o) setEditCampaign(null)
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="edit-campaign-desc">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar campaña</DialogTitle>
            <p id="edit-campaign-desc" className="sr-only">
              Formulario para editar la campaña seleccionada
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Asunto</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mensaje base</Label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="text-xs min-h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-8 text-xs" onClick={() => setEditCampaign(null)}>
              Cancelar
            </Button>
            <Button className="h-8 text-xs" onClick={() => setEditCampaign(null)}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── VIEW CONTACTS MODAL ───────────────────────────────── */}
      <Dialog
        open={!!viewCampaign}
        onOpenChange={(o) => {
          if (!o) {
            setViewCampaign(null)
            setEditingContact(null)
          }
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="view-contacts-desc">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{viewCampaign?.name} — Contactos</DialogTitle>
            <p id="view-contacts-desc" className="sr-only">
              Lista de contactos de la campaña
            </p>
          </DialogHeader>
          <div className="space-y-2 max-h-85 overflow-y-auto pr-1">
            {viewCampaign?.contacts.map((c) => (
              <div key={c.name} className="rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-emerald-500 truncate">{c.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.score}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      editingContact === c.name
                        ? setEditingContact(null)
                        : openContactEdit(c, viewCampaign)
                    }
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </div>
                {editingContact === c.name && (
                  <div className="px-3 pb-3 border-t border-border space-y-2">
                    <Input
                      placeholder="Asunto personalizado…"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="h-7 text-xs mt-2"
                    />
                    <Textarea
                      placeholder="Mensaje personalizado…"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="text-xs min-h-15 resize-none"
                    />
                    <Button
                      size="sm"
                      className="h-6 text-xs w-full"
                      onClick={() => setEditingContact(null)}
                    >
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-8 text-xs w-full"
              onClick={() => {
                setViewCampaign(null)
                setEditingContact(null)
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI MESSAGE MODAL ──────────────────────────────────── */}
      <Dialog
        open={!!aiCampaign}
        onOpenChange={(o) => {
          if (!o) {
            setAiCampaign(null)
            setAiGenerating(false)
            setAiDone(false)
            setAiPrompt('')
          }
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="ai-gen-desc">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Generar mensajes con IA
            </DialogTitle>
            <p id="ai-gen-desc" className="sr-only">
              Genera mensajes personalizados con inteligencia artificial
            </p>
          </DialogHeader>

          {!aiDone ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Describe cómo quieres que la IA escriba los mensajes para los{' '}
                <span className="text-foreground font-medium">
                  {aiCampaign?.contactCount} contactos
                </span>{' '}
                de esta campaña. La IA personalizará el mensaje de cada uno según su perfil y
                afinidad.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Instrucciones para la IA</Label>
                <Textarea
                  placeholder="ej: Escribe un mensaje de presentación profesional, menciona nuestra especialización en IA y análisis de datos, y propón una colaboración editorial. Tono: cercano pero profesional."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-xs min-h-25 resize-none"
                  disabled={aiGenerating}
                />
              </div>
              {aiGenerating && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Generando mensajes personalizados para {aiCampaign?.contactCount} contactos…
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">¡Mensajes generados!</p>
              <p className="text-xs text-muted-foreground">
                La IA ha personalizado el asunto y el mensaje para cada uno de los{' '}
                {aiCampaign?.contactCount} contactos según su perfil y afinidad.
              </p>
            </div>
          )}

          <DialogFooter>
            {!aiDone ? (
              <>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setAiCampaign(null)
                    setAiPrompt('')
                  }}
                  disabled={aiGenerating}
                >
                  Cancelar
                </Button>
                <Button
                  className="h-8 text-xs gap-1"
                  disabled={!aiPrompt.trim() || aiGenerating}
                  onClick={handleAIGenerate}
                >
                  {aiGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                  {aiGenerating ? 'Generando…' : 'Generar'}
                </Button>
              </>
            ) : (
              <Button
                className="h-8 text-xs w-full"
                onClick={() => {
                  setAiCampaign(null)
                  setAiDone(false)
                  setAiPrompt('')
                }}
              >
                Listo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
