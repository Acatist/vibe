import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  XCircle,
  ArrowRight,
  Building2,
  User,
  Landmark,
  ChevronLeft,
  Info,
  Zap,
  Search,
  Bot,
  Users,
  Shield,
  Plus,
  RefreshCcw,
  Globe,
  Pause,
  Play,
  Square,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@components/ui/button'
import { Textarea } from '@components/ui/textarea'
import { Slider } from '@components/ui/slider'
import { Badge } from '@components/ui/badge'
import { Skeleton } from '@components/ui/skeleton'
import { Progress } from '@components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Card, CardContent } from '@components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip'
import { useAIStore, selectApiKey } from '@store/ai.store'
import { useInvestigationStore } from '@store/investigation.store'
import { useEnergy } from '@hooks/useEnergy'
import { useEnergyStore } from '@store/energy.store'
import { getAIProvider } from '@services/ai.service'
import { useContactsStore } from '@store/contacts.store'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import { AFFINITY_CATEGORIES, CONTACT_LANGUAGES, COUNTRIES } from '@core/constants/affinity'
import type { ContactType, CampaignBrief } from '@/providers/ai/ai.provider'
import type { Contact, ContactCategory } from '@core/types/contact.types'
import type { TabId } from '@components/layout/Navigation'

interface InvestigationViewProps {
  onNavigate: (tab: TabId) => void
}

type Phase = 'form' | 'analyzing' | 'report' | 'scraping' | 'error'

const CONTACT_TYPES: { value: ContactType; labelKey: string; icon: LucideIcon }[] = [
  { value: 'corporate', labelKey: 'investigation.contactTypes.corporate', icon: Building2 },
  { value: 'individual', labelKey: 'investigation.contactTypes.individual', icon: User },
  { value: 'institutional', labelKey: 'investigation.contactTypes.institutional', icon: Landmark },
]

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  zh: 'Chinese',
  ja: 'Japanese',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Dutch',
  pl: 'Polish',
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px] text-center leading-snug">{text}</TooltipContent>
    </Tooltip>
  )
}

// ── Module-level helpers ─────────────────────────────────────────────────────

function formatEmailToName(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function inferCategory(affinityCategory: string, contactType: ContactType): ContactCategory {
  const cat = affinityCategory.toLowerCase()
  if (cat.includes('media') || cat.includes('journalism') || cat.includes('press'))
    return 'journalist'
  if (cat.includes('legal') || cat.includes('advocacy') || cat.includes('rights'))
    return 'legal-advocate'
  if (
    cat.includes('ngo') ||
    cat.includes('environment') ||
    cat.includes('social') ||
    contactType === 'institutional'
  )
    return 'ngo'
  if (cat.includes('research') || cat.includes('academic') || cat.includes('education'))
    return 'researcher'
  return 'researcher'
}

export function InvestigationView({ onNavigate }: InvestigationViewProps) {
  const { t, i18n } = useTranslation()
  const apiKey = useAIStore(selectApiKey)
  const {
    setLastAnalysisMarkdown,
    startInvestigation,
    setError: setInvError,
    setScrapeStatus,
    completeInvestigation,
    addContactIds,
  } = useInvestigationStore()
  const { addContacts: addContactsToStore, contacts: allContacts } = useContactsStore()
  const { energy, energyPercent, isInfinite, refill } = useEnergy()
  const reportRef = useRef<HTMLDivElement>(null)
  const briefRef = useRef<CampaignBrief | null>(null)
  const invIdRef = useRef<string>('')

  // Form state
  const [contactType, setContactType] = useState<ContactType>('corporate')
  const [affinityCategory, setAffinityCategory] = useState('')
  const [affinitySubcategory, setAffinitySubcategory] = useState('')
  const [language, setLanguage] = useState('any')
  const [country, setCountry] = useState('worldwide')
  const [consistency, setConsistency] = useState([5])
  const [description, setDescription] = useState('')

  // Execution state
  const [phase, setPhase] = useState<Phase>('form')
  const [reportMarkdown, setReportMarkdown] = useState('')
  const [error, setError] = useState('')
  const [bonusPercent, setBonusPercent] = useState(0)
  const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, currentUrl: '' })
  const [contactsFound, setContactsFound] = useState(0)
  const [targetScrapeCount, setTargetScrapeCount] = useState([50])
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'paused'>('idle')

  const selectedCategory = AFFINITY_CATEGORIES.find((c) => c.value === affinityCategory)
  const subcategories = selectedCategory?.subcategories ?? []

  // ── Real-scraping message listener ─────────────────────────────────────────
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMessage = (msg: any) => {
      if (msg.type === MessageType.SCRAPING_PROGRESS) {
        const p = msg.payload
        setScrapeProgress({
          current: p.pagesScanned,
          total: p.targetCount,
          currentUrl: p.currentUrl,
        })
        setContactsFound(p.contactsFound)
        // Sync energy display with the background’s real consumption
        if (typeof p.energyLeft === 'number') {
          useEnergyStore.setState({ current: p.energyLeft })
        }
        if (p.status === 'paused') setScrapingStatus('paused')
        else if (p.status === 'running') setScrapingStatus('running')
      } else if (msg.type === MessageType.SCRAPING_CONTACT) {
        const c = msg.payload.contact
        const contact: Contact = {
          id: crypto.randomUUID(),
          name: c.name || formatEmailToName(c.email),
          role: c.role || '',
          organization: c.organization || '',
          email: c.email,
          website: c.website || '',
          contactPage: c.contactPage || '',
          specialization: c.specialization || '',
          topics: c.topics?.length
            ? c.topics
            : [
                briefRef.current?.affinityCategory ?? '',
                briefRef.current?.affinitySubcategory ?? '',
              ].filter(Boolean),
          region: c.region || 'International',
          recentArticles: [],
          category: inferCategory(
            briefRef.current?.affinityCategory ?? '',
            briefRef.current?.contactType ?? 'corporate',
          ) as ContactCategory,
          relevanceScore: 50 + Math.floor(Math.random() * 31),
          investigationId: invIdRef.current,
        }
        addContactsToStore([contact])
        addContactIds(invIdRef.current, [contact.id])
      } else if (msg.type === MessageType.SCRAPING_COMPLETE) {
        setScrapeStatus(invIdRef.current, 'done')
        completeInvestigation(invIdRef.current)
        setScrapingStatus('idle')
        onNavigate('contacts')
      } else if (msg.type === MessageType.SCRAPING_ERROR) {
        setError(msg.payload.error)
        setScrapeStatus(invIdRef.current, 'error')
        setScrapingStatus('idle')
        setPhase('report')
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage?.removeListener(onMessage)
    // onNavigate is stable for the lifetime of this panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAnalyze() {
    if (!description.trim()) return
    setPhase('analyzing')
    setError('')

    const invId = startInvestigation(description.trim(), consistency[0])
    invIdRef.current = invId

    try {
      const provider = getAIProvider()
      const categoryLabel = selectedCategory?.label ?? affinityCategory
      const subcategoryLabel =
        subcategories.find((s) => s.value === affinitySubcategory)?.label ?? affinitySubcategory
      const langLabel = CONTACT_LANGUAGES.find((l) => l.value === language)?.label ?? language
      const countryLabel = COUNTRIES.find((c) => c.value === country)?.label ?? country

      const brief: CampaignBrief = {
        contactType,
        affinityCategory: categoryLabel,
        affinitySubcategory: subcategoryLabel,
        language: langLabel,
        country: countryLabel,
        consistency: consistency[0],
        description: description.trim(),
        reportLanguage: LOCALE_NAMES[i18n.language] ?? i18n.language,
      }
      briefRef.current = brief

      const result = await provider.analyzeCampaign(brief)

      if (result.success && result.data) {
        setReportMarkdown(result.data.reportMarkdown)
        // Persist immediately so it survives view-switches
        setLastAnalysisMarkdown(result.data.reportMarkdown)
        setPhase('report')
      } else {
        setError(result.error ?? 'Analysis failed')
        setInvError(invId, result.error ?? 'Analysis failed')
        setPhase('error')
      }
    } catch (e) {
      setError((e as Error).message)
      setInvError(invId, (e as Error).message)
      setPhase('error')
    }
  }

  async function handleStartScraping() {
    const invId = invIdRef.current
    if (!invId) return

    setPhase('scraping')
    setContactsFound(0)
    setScrapeProgress({ current: 0, total: targetScrapeCount[0], currentUrl: '' })
    setScrapingStatus('running')
    setScrapeStatus(invId, 'running')

    const categoryLabel = selectedCategory?.label ?? affinityCategory
    const subcategoryLabel =
      subcategories.find((s) => s.value === affinitySubcategory)?.label ?? affinitySubcategory

    await messageService.send(MessageType.SCRAPING_START, {
      invId,
      query: description.trim(),
      targetCount: targetScrapeCount[0],
      affinityCategory: categoryLabel,
      affinitySubcategory: subcategoryLabel,
      country: COUNTRIES.find((c) => c.value === country)?.label ?? country,
      language: CONTACT_LANGUAGES.find((l) => l.value === language)?.label ?? language,
      contactType,
    })
  }

  function handlePauseScraping() {
    setScrapingStatus('paused')
    messageService.send(MessageType.SCRAPING_PAUSE, { invId: invIdRef.current }).catch(() => {})
  }

  function handleResumeScraping() {
    setScrapingStatus('running')
    messageService.send(MessageType.SCRAPING_RESUME, { invId: invIdRef.current }).catch(() => {})
  }

  function handleCancelScraping() {
    messageService.send(MessageType.SCRAPING_CANCEL, { invId: invIdRef.current }).catch(() => {})
    setScrapingStatus('idle')
    setPhase('report')
  }

  const consistencyLabel =
    consistency[0] <= 3
      ? t('investigation.consistencyBroad')
      : consistency[0] <= 7
        ? t('investigation.consistencyBalanced')
        : t('investigation.consistencyStrict')

  // ── Energy computations ──
  const displayPercent = energyPercent + bonusPercent
  const totalActions = displayPercent * 10

  const eTheme = {
    stroke: 'var(--color-primary)',
    barClass: 'bg-primary',
    textClass: 'text-primary',
    borderClass: 'border-primary/40',
    glowColor: 'rgba(var(--primary),0.35)',
    label:
      displayPercent <= 100
        ? 'Standard'
        : displayPercent <= 200
          ? 'Plus'
          : displayPercent <= 300
            ? 'Pro'
            : displayPercent <= 400
              ? 'Advanced'
              : displayPercent <= 500
                ? 'Elite'
                : displayPercent <= 700
                  ? 'Ultra'
                  : 'Legendary',
  }

  // SVG ring
  const RING_R = 18
  const RING_C = 2 * Math.PI * RING_R // ~113.1
  const ringFill = isInfinite ? 1 : Math.min(displayPercent, 100) / 100
  const ringOffset = RING_C * (1 - ringFill)
  const barFillPct = isInfinite ? 100 : Math.min(displayPercent, 100)

  // ── ANALYZING PHASE ──
  if (phase === 'analyzing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">{t('investigation.analyzing')}</p>
          <p className="text-xs text-muted-foreground">{t('investigation.analyzingSubtext')}</p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    )
  }

  // ── SCRAPING PHASE ──
  if (phase === 'scraping') {
    const progressPct =
      scrapeProgress.total > 0
        ? Math.round((scrapeProgress.current / scrapeProgress.total) * 100)
        : 0
    const liveContacts = invIdRef.current
      ? allContacts.filter((c) => c.investigationId === invIdRef.current)
      : []
    return (
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Globe className="w-7 h-7 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">
              {scrapingStatus === 'paused'
                ? t('investigation.scrapingPaused')
                : t('investigation.scraping')}
            </p>
            <p className="text-xs text-muted-foreground">{t('investigation.scrapingSubtext')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('investigation.sitesScanned')}</span>
              <span className="font-medium tabular-nums">
                {scrapeProgress.current}/{scrapeProgress.total || '…'}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {scrapeProgress.currentUrl && (
            <div className="flex items-center gap-2">
              <Search className="w-3 h-3 shrink-0 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground truncate">
                {scrapeProgress.currentUrl}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">
              {t('investigation.contactsFound')}
            </span>
            <span className="text-sm font-bold text-primary tabular-nums">{contactsFound}</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {t('investigation.scrapingNotice')}
          </p>
        </div>

        {/* ── Live contacts cascade list ── */}
        {liveContacts.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Contactos encontrados
              </span>
              <span className="text-xs font-bold text-primary tabular-nums">
                {liveContacts.length}
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-border/30">
              {liveContacts
                .slice()
                .reverse()
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 animate-fade-in">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.organization || c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Pause / Cancel controls ── */}
        <div className="flex gap-2">
          {scrapingStatus === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={handlePauseScraping}
            >
              <Pause className="w-3 h-3" />
              {t('investigation.pauseScraping')}
            </Button>
          ) : scrapingStatus === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5 border-primary/40 text-primary"
              onClick={handleResumeScraping}
            >
              <Play className="w-3 h-3" />
              {t('investigation.resumeScraping')}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleCancelScraping}
          >
            <Square className="w-3 h-3" />
            {t('investigation.cancelScraping')}
          </Button>
        </div>
      </div>
    )
  }

  // ── REPORT PHASE ──
  if (phase === 'report') {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex-1 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setPhase('form')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t('investigation.modifyFilters')}
          </button>

          <div ref={reportRef} className="rounded-xl border border-border bg-card px-5 py-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-sm font-bold text-foreground mb-3 pb-2 border-b border-border">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xs font-semibold text-foreground mt-4 mb-1.5">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-[11px] font-semibold text-primary mt-2 mb-1 uppercase tracking-wide">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-xs text-foreground leading-relaxed mb-2">{children}</p>
                ),
                ul: ({ children }) => <ul className="mb-2 ml-1 space-y-0.5">{children}</ul>,
                ol: ({ children }) => (
                  <ol className="mb-2 ml-3 space-y-0.5 list-decimal">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-xs text-foreground flex gap-1.5 items-start">
                    <span className="text-primary mt-[3px] shrink-0">▸</span>
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-muted-foreground not-italic text-[10px]">{children}</em>
                ),
                hr: () => <hr className="border-border my-3" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3 rounded-lg border border-border">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-accent">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-border last:border-0">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-accent-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{children}</td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary pl-3 my-2 text-xs text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-primary">
                    {children}
                  </code>
                ),
              }}
            >
              {reportMarkdown}
            </ReactMarkdown>
          </div>

          <div className="flex flex-col gap-2">
            {/* ── Target count slider ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('investigation.targetCountLabel')}
                  </p>
                  <InfoTip text={t('investigation.targetCountTooltip')} />
                </div>
                <Badge variant="outline" className="font-mono text-xs h-5 px-1.5 shrink-0">
                  {targetScrapeCount[0].toLocaleString()}
                </Badge>
              </div>
              <Slider
                value={targetScrapeCount}
                onValueChange={setTargetScrapeCount}
                min={10}
                max={1000}
                step={10}
                className="h-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10</span>
                <span>500</span>
                <span>1,000</span>
              </div>
              {!isInfinite && targetScrapeCount[0] > energy.current && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-600 leading-tight">
                    {t('investigation.energyWarning', {
                      total: targetScrapeCount[0],
                      available: energy.current,
                    })}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleStartScraping}
              className="w-full h-11 font-semibold gap-2 text-sm"
            >
              <Globe className="w-4 h-4" />
              {t('investigation.searchContacts')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setLastAnalysisMarkdown(reportMarkdown)
                onNavigate('contacts')
              }}
              className="w-full h-9 text-xs gap-1.5"
            >
              {t('investigation.skipToContacts')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </TooltipProvider>
    )
  }
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* ── Card 1: Energy module ── */}
        <Card
          className="relative overflow-hidden shrink-0"
          style={{ borderColor: 'oklch(var(--primary) / 0.25)' }}
        >
          {' '}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 30% 50%, oklch(var(--primary)), transparent 65%)',
            }}
          />
          <CardContent className="p-4 space-y-3">
            {/* ── TOP ROW: ring (left) | info (center) | badges (right) ── */}
            <div className="flex items-start gap-3">
              {/* Circular ring */}
              <div className="relative w-[100px] h-auto aspect-square shrink-0">
                <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90" fill="none">
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_R}
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                    fill="none"
                  />
                  {/* secondary glow ring */}
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_R}
                    stroke="currentColor"
                    strokeWidth="7"
                    fill="none"
                    opacity="0.12"
                    className="text-primary"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                  />
                  {/* main arc */}
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_R}
                    stroke="currentColor"
                    className="text-primary"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className={`text-[15px] font-extrabold leading-none ${eTheme.textClass}`}>
                    {isInfinite ? '∞' : displayPercent}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-none">%</span>
                </div>
              </div>

              {/* Center: title + slogan + tier + action buttons */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <h2 className="text-sm font-bold text-foreground leading-tight">
                      {t('investigation.title')}
                    </h2>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {t('investigation.slogan')}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-[18px] px-1.5 shrink-0 border-primary/30 text-primary"
                  >
                    AI ✦
                  </Badge>
                </div>

                {/* Tier badge */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border text-primary border-primary/40 bg-primary/5">
                    <Zap className="w-2.5 h-2.5" />
                    {eTheme.label}
                  </span>
                  <InfoTip text={t('investigation.energyTooltip')} />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!isInfinite && energyPercent < 100 && (
                    <button
                      type="button"
                      onClick={() => refill(energy.max - energy.current)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 transition-colors hover:border-foreground/40"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                      {t('investigation.recharge')}
                    </button>
                  )}
                  {!isInfinite && energyPercent >= 100 && (
                    <button
                      type="button"
                      onClick={() => setBonusPercent((bp) => bp + 10)}
                      className="flex items-center gap-1 text-[10px] font-semibold border rounded-md px-2 py-0.5 transition-all hover:opacity-80 text-primary border-primary/40"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      +10% · 100 acc
                    </button>
                  )}
                  {bonusPercent > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[9px] h-[18px] px-1.5 text-primary border-primary/40"
                    >
                      +{bonusPercent}% extra
                    </Badge>
                  )}
                </div>
              </div>

              {/* RIGHT: stacked LED feature badges */}
              <div className="flex flex-col gap-1.5 shrink-0 items-stretch w-[110px]">
                {(
                  [
                    {
                      icon: Search,
                      label: t('investigation.featureDiscover'),
                      dot: 'bg-blue-500',
                      pulse: 'shadow-blue-500/50',
                    },
                    {
                      icon: Bot,
                      label: t('investigation.featureAnalyze'),
                      dot: 'bg-violet-500',
                      pulse: 'shadow-violet-500/50',
                    },
                    {
                      icon: Users,
                      label: t('investigation.featureReach'),
                      dot: 'bg-emerald-500',
                      pulse: 'shadow-emerald-500/50',
                    },
                  ] as const
                ).map(({ icon: Icon, label, dot, pulse }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 rounded-lg bg-background/70 px-2 py-1.5 border border-border/60"
                  >
                    <Icon className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[9px] text-muted-foreground leading-none truncate flex-1">
                      {label}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse shadow-sm ${dot} ${pulse}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── BOTTOM: power / send bar ── */}
            <div className="space-y-1 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Zap className={`w-3 h-3 ${eTheme.textClass}`} />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('investigation.energyLabel')}
                  </span>
                </div>
                <span className={`font-mono text-[10px] font-bold ${eTheme.textClass}`}>
                  {isInfinite ? '∞' : `${totalActions.toLocaleString()} acc`}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${eTheme.barClass}`}
                  style={{
                    width: `${barFillPct}%`,
                    boxShadow: `0 0 8px ${eTheme.glowColor}`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-medium ${eTheme.textClass}`}>
                  ⚡ {t('investigation.sendPower')} · {eTheme.label}
                </span>
                <span className="text-[9px] text-muted-foreground">{barFillPct}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Contact type (no card) ── */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t('investigation.contactType')}
            </p>
            <InfoTip text={t('investigation.contactTypeTooltip')} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CONTACT_TYPES.map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setContactType(value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
                  contactType === value
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card 2: Filters ── */}
        <Card className="shrink-0">
          <CardContent className="p-4 space-y-4">
            {/* Affinity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('investigation.affinity')}
                </p>
                <InfoTip text={t('investigation.affinityTooltip')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={affinityCategory}
                  onValueChange={(v) => {
                    setAffinityCategory(v)
                    setAffinitySubcategory('')
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t('investigation.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {AFFINITY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={affinitySubcategory}
                  onValueChange={setAffinitySubcategory}
                  disabled={subcategories.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t('investigation.subcategoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value} className="text-xs">
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language & Country */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('investigation.targeting')}
                </p>
                <InfoTip text={t('investigation.targetingTooltip')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value} className="text-xs">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {t('investigation.languageLabel')}
                  </p>
                </div>
                <div className="space-y-1">
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {t('investigation.countryLabel')}
                  </p>
                </div>
              </div>
            </div>

            {/* Consistency slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('investigation.consistency')}
                  </p>
                  <InfoTip text={t('investigation.consistencyTooltip')} />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5 shrink-0">
                  {consistency[0]}/10 · {consistencyLabel}
                </Badge>
              </div>
              <Slider
                className="h-1"
                value={consistency}
                onValueChange={setConsistency}
                min={1}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('investigation.consistencyBroad')}</span>
                <span>{t('investigation.consistencyBalanced')}</span>
                <span>{t('investigation.consistencyStrict')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Card 3: Details + CTA ── */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex flex-col gap-3 p-4 min-h-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('investigation.descriptionLabel')}
              </p>
              <InfoTip text={t('investigation.descriptionTooltip')} />
            </div>

            {phase === 'error' && (
              <div className="shrink-0 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('investigation.descriptionPlaceholder')}
              className="flex-1 min-h-[120px] resize-none text-xs leading-relaxed"
            />

            {!apiKey && (
              <div className="shrink-0 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600">{t('investigation.noApiKey')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleAnalyze}
          disabled={!description.trim() || !apiKey}
          className="shrink-0 w-full h-11 font-semibold gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          {t('investigation.acceptAndContinue')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </TooltipProvider>
  )
}
