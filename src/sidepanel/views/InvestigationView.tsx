import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  XCircle,
  ArrowRight,
  Building2,
  User,
  Landmark,
  Info,
  Zap,
  Search,
  Bot,
  Users,
  Shield,
  Plus,
  RefreshCcw,
  Globe,
  FileText,
  X,
  ChevronRight,
  CreditCard,
  Lock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@components/ui/button'
import { Textarea } from '@components/ui/textarea'
import { Slider } from '@components/ui/slider'
import { Badge } from '@components/ui/badge'
import { Skeleton } from '@components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Card, CardContent } from '@components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog'
import { useAIStore, selectApiKey } from '@store/ai.store'
import { useInvestigationStore } from '@store/investigation.store'
import { useEnergy } from '@hooks/useEnergy'
import { useRuntimeStore } from '@store/runtime.store'
import { getAIProvider } from '@services/ai.service'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import { AFFINITY_CATEGORIES, CONTACT_LANGUAGES, COUNTRIES } from '@core/constants/affinity'
import type { ContactType, CampaignBrief } from '@/providers/ai/ai.provider'
import type { TabId } from '@components/layout/Navigation'

interface InvestigationViewProps {
  onNavigate: (tab: TabId) => void
}

type Phase = 'form' | 'analyzing'

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

// ── Battle.net bar colour class — kept for future re-enable
// function getBnetBarColorClass(pct: number, infinite: boolean): string {
//   if (infinite || pct >= 100) return 'bnet-progress__bar--blue'
//   if (pct >= 85) return 'bnet-progress__bar--green'
//   if (pct >= 55) return 'bnet-progress__bar--yellow'
//   if (pct >= 30) return 'bnet-progress__bar--orange'
//   return ''
// }

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="max-w-50 text-center leading-snug">{text}</TooltipContent>
    </Tooltip>
  )
}
export function InvestigationView({ onNavigate }: InvestigationViewProps) {
  const { t, i18n } = useTranslation()
  const apiKey = useAIStore(selectApiKey)
  const {
    setLastAnalysisMarkdown,
    lastAnalysisMarkdown,
    startInvestigation,
    setError: setInvError,
    setScrapeStatus,
    setActiveBrief,
    setLiveScrapingProgress,
    setLiveScrapingDone,
  } = useInvestigationStore()
  const { energy, energyPercent, isInfinite, refill } = useEnergy()
  const { mode: runtimeMode } = useRuntimeStore()
  // isDev used by the payment modal and hidden progress bar (re-enable when needed)
  const _isDev = runtimeMode !== 'production'
  void _isDev
  /** The invId created by handleAnalyze — passed to handleStartScraping via the modal. */
  const currentInvIdRef = useRef<string>('')

  // Recharge simulation state (dev only) — null = real value, number = animated value
  const [rechargeAnimPct, setRechargeAnimPct] = useState<number | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Form state
  const [contactType, setContactType] = useState<ContactType>('corporate')
  const [affinityCategory, setAffinityCategory] = useState('')
  const [affinitySubcategory, setAffinitySubcategory] = useState('')
  const [language, setLanguage] = useState('any')
  const [country, setCountry] = useState('worldwide')
  const [consistency] = useState([5])
  const [description, setDescription] = useState('')
  const [targetScrapeCount, setTargetScrapeCount] = useState([50])
  const [scrapingMode, setScrapingMode] = useState<'fast' | 'precise'>('fast')
  /** Whether to generate an AI analysis report before starting the search. */
  const [generateReport, setGenerateReport] = useState(true)

  // Execution / modal state
  const [phase, setPhase] = useState<Phase>('form')
  const [reportMarkdown, setReportMarkdown] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [bonusPercent, setBonusPercent] = useState(0)

  const selectedCategory = AFFINITY_CATEGORIES.find((c) => c.value === affinityCategory)
  const subcategories = selectedCategory?.subcategories ?? []

  async function handleAnalyze() {
    if (!description.trim()) return
    setPhase('analyzing')
    setError('')

    const invId = startInvestigation(description.trim(), consistency[0])
    currentInvIdRef.current = invId

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

      const result = await provider.analyzeCampaign(brief)

      if (result.success && result.data) {
        setReportMarkdown(result.data.reportMarkdown)
        // Persist immediately so it survives view-switches
        setLastAnalysisMarkdown(result.data.reportMarkdown)
        setPhase('form')
        setReportModalOpen(true)
      } else {
        setError(result.error ?? 'Analysis failed')
        setInvError(invId, result.error ?? 'Analysis failed')
        setPhase('form')
      }
    } catch (e) {
      setError((e as Error).message)
      setInvError(invId, (e as Error).message)
      setPhase('form')
    }
  }

  /** Start scraping for the given invId and immediately navigate to contacts. */
  async function handleStartScraping(invId: string) {
    const categoryLabel = selectedCategory?.label ?? affinityCategory
    const subcategoryLabel =
      subcategories.find((s) => s.value === affinitySubcategory)?.label ?? affinitySubcategory

    // Store brief so AppShell's global listener can build Contact objects.
    setActiveBrief({
      affinityCategory: categoryLabel,
      affinitySubcategory: subcategoryLabel,
      contactType,
    })

    setScrapeStatus(invId, 'running')

    // Show the progress card immediately — don't wait for the first broadcast.
    setLiveScrapingProgress({
      status: 'running',
      contactsFound: 0,
      currentUrl: '',
      total: targetScrapeCount[0],
      pagesScanned: 0,
    })

    const result = await messageService.send(MessageType.SCRAPING_START, {
      invId,
      query: description.trim(),
      targetCount: targetScrapeCount[0],
      affinityCategory: categoryLabel,
      affinitySubcategory: subcategoryLabel,
      country: COUNTRIES.find((c) => c.value === country)?.label ?? country,
      language: CONTACT_LANGUAGES.find((l) => l.value === language)?.label ?? language,
      contactType,
      scrapingMode,
      consistency: consistency[0],
    })

    if (!result?.success) {
      setError(result?.error ?? 'Failed to start scraping — please reload the extension.')
      setScrapeStatus(invId, 'idle')
      setLiveScrapingDone()
      return
    }

    onNavigate('contacts')
  }

  /** Called by the main CTA button. */
  async function handleAcceptAndContinue() {
    if (!description.trim()) return
    setError('')
    if (generateReport) {
      // Analyze → show report modal → user confirms → start scraping
      await handleAnalyze()
    } else {
      // Skip report — create invId and go straight to contacts
      const invId = startInvestigation(description.trim(), consistency[0])
      currentInvIdRef.current = invId
      await handleStartScraping(invId)
    }
  }

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

  // ── Max contacts allowed by current energy (send power) ──────────────────
  // totalActions = displayPercent * 10 → at 100 % energy = 1 000 contacts max
  const maxAllowedContacts = isInfinite
    ? 1000
    : Math.min(Math.max(Math.floor(totalActions), 0), 1000)
  const contactSliderDisabled = !isInfinite && maxAllowedContacts < 10

  // Clamp current selection if energy drops below it
  useEffect(() => {
    if (!isInfinite && targetScrapeCount[0] > maxAllowedContacts && maxAllowedContacts >= 10) {
      setTargetScrapeCount([maxAllowedContacts])
    }
  }, [maxAllowedContacts, isInfinite]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recharge animation tick ──────────────────────────────────────────────
  useEffect(() => {
    if (rechargeAnimPct === null) return
    if (rechargeAnimPct >= barFillPct) {
      const done = setTimeout(() => setRechargeAnimPct(null), 600)
      return () => clearTimeout(done)
    }
    const tick = setTimeout(() => {
      setRechargeAnimPct((prev) => (prev !== null ? Math.min(prev + 1.5, barFillPct) : null))
    }, 35)
    return () => clearTimeout(tick)
  }, [rechargeAnimPct, barFillPct])

  // Use animated pct when running, otherwise real pct — kept for future re-enable
  // const activeFillPct = rechargeAnimPct !== null ? rechargeAnimPct : barFillPct

  // function handleRechargeClick() {
  //   if (isDev) {
  //     setRechargeAnimPct(0)
  //   } else {
  //     setPaymentModalOpen(true)
  //   }
  // }

  // ── ANALYZING (spinner overlay) ──────────────────────────────────────────
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

  // ── FORM (main view) ─────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* ── Energy Progress Bar — Battle.net style (simeydotme/abPxRE) — HIDDEN ──
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${eTheme.textClass}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('investigation.energyLabel')}
              </span>
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${eTheme.borderClass} ${eTheme.textClass} bg-primary/5`}
              >
                {eTheme.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRechargeClick}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all
                bg-emerald-500/15 text-emerald-400 border border-emerald-500/40
                hover:bg-emerald-500/25 hover:border-emerald-400 hover:text-emerald-300
                active:scale-95"
            >
              <Zap className="w-2.5 h-2.5" />
              {isDev ? 'Simular recarga' : 'Recargar Energía'}
            </button>
          </div>
          <div
            className={[
              'bnet-progress',
              activeFillPct > 0 || isInfinite ? 'bnet-progress--active' : '',
              isInfinite || activeFillPct >= 100 ? 'bnet-progress--complete' : '',
            ].join(' ')}
          >
            <b
              className={`bnet-progress__bar ${getBnetBarColorClass(activeFillPct, isInfinite)}`}
              style={{ width: isInfinite ? '100%' : `${activeFillPct}%` }}
            >
              <span className="bnet-progress__text">
                {t('investigation.energyLabel')}: <em>{isInfinite ? '∞' : `${Math.round(activeFillPct)}%`}</em>
              </span>
            </b>
          </div>
        </div>
        ── END HIDDEN ── */}

        {/* ── Payment modal (production mode) ── */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Recargar Energía
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">
                Adquiere más energía para continuar con tus campañas de Vibe Reach.
              </p>

              {/* Plan selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1 000', energy: '1k', price: '€4,99' },
                  { label: '5 000', energy: '5k', price: '€17,99', highlight: true },
                  { label: '15 000', energy: '15k', price: '€39,99' },
                ].map(({ label, energy: e, price, highlight }) => (
                  <div
                    key={e}
                    className={`relative flex flex-col items-center gap-0.5 rounded-xl border p-3 text-center ${
                      highlight
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    {highlight && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                        Popular
                      </span>
                    )}
                    <Zap
                      className={`w-4 h-4 ${highlight ? 'text-emerald-400' : 'text-muted-foreground'}`}
                    />
                    <span className="text-xs font-bold text-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground">energía</span>
                    <span
                      className={`text-sm font-extrabold mt-1 ${highlight ? 'text-emerald-400' : 'text-foreground'}`}
                    >
                      {price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card placeholder */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="w-3.5 h-3.5" />
                  Tarjeta de crédito / débito
                </div>
                <div className="h-8 rounded-md bg-muted/60 border border-border" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 rounded-md bg-muted/60 border border-border" />
                  <div className="h-8 rounded-md bg-muted/60 border border-border" />
                </div>
              </div>

              <Button disabled className="w-full gap-2 opacity-60 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                Pago seguro — Próximamente
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                Procesado por Stripe · SSL 256-bit
              </p>
            </div>
          </DialogContent>
        </Dialog>

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
              <div className="relative w-25 h-auto aspect-square shrink-0">
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
                    className="text-[9px] h-4.5 px-1.5 shrink-0 border-primary/30 text-primary"
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
                      onClick={() => refill((energy.max ?? 1000) - (energy.current ?? 0))}
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
                      className="text-[9px] h-4.5 px-1.5 text-primary border-primary/40"
                    >
                      +{bonusPercent}% extra
                    </Badge>
                  )}
                </div>
              </div>

              {/* RIGHT: stacked LED feature badges */}
              <div className="flex flex-col gap-1.5 shrink-0 items-stretch w-27.5">
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

            {/* Consistency slider removed — hardcoded to 5 (balanced) */}
          </CardContent>
        </Card>

        {/* ── Card 3: Scraping Mode ── */}
        <Card className="shrink-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('investigation.scrapingMode')}
              </p>
              <InfoTip text={t('investigation.scrapingModeTooltip')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScrapingMode('fast')}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                  scrapingMode === 'fast'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className="text-xs font-semibold">{t('investigation.scrapingModeFast')}</span>
                <span className="text-[10px] text-muted-foreground leading-snug">
                  {t('investigation.scrapingModeFastDesc')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScrapingMode('precise')}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                  scrapingMode === 'precise'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  {t('investigation.scrapingModePrecise')}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug">
                  {t('investigation.scrapingModePreciseDesc')}
                </span>
              </button>
            </div>

            {/* Target count */}
            <div className="pt-1 space-y-2 border-t border-border/40">
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
                max={Math.max(10, maxAllowedContacts)}
                step={10}
                className={`h-1 ${contactSliderDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                disabled={contactSliderDisabled}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10</span>
                <span>{Math.floor(maxAllowedContacts / 2).toLocaleString()}</span>
                <span>{maxAllowedContacts.toLocaleString()}</span>
              </div>
              {contactSliderDisabled && (
                <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 border border-destructive/30 px-2.5 py-2">
                  <Zap className="w-3 h-3 text-destructive shrink-0" />
                  <p className="text-[11px] text-destructive leading-tight">
                    Sin energía disponible. Recarga para desbloquear el selector.
                  </p>
                </div>
              )}
              {!contactSliderDisabled &&
                !isInfinite &&
                targetScrapeCount[0] > (energy.current ?? 0) && (
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
          </CardContent>
        </Card>

        {/* ── Card 4: Details + CTA ── */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex flex-col gap-3 p-4 min-h-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t('investigation.descriptionLabel')}
              </p>
              <InfoTip text={t('investigation.descriptionTooltip')} />
            </div>

            {error && (
              <div className="shrink-0 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('investigation.descriptionPlaceholder')}
              className="flex-1 min-h-30 resize-none text-xs leading-relaxed"
            />

            {!apiKey && (
              <div className="shrink-0 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600">{t('investigation.noApiKey')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Report toggle ── */}
        <div className="shrink-0 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium">{t('investigation.generateReport')}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {t('investigation.generateReportDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={generateReport}
            onClick={() => setGenerateReport((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              generateReport ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                generateReport ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ── View last saved report pill ── */}
        {lastAnalysisMarkdown && (
          <button
            type="button"
            onClick={() => {
              setReportMarkdown(lastAnalysisMarkdown)
              setReportModalOpen(true)
            }}
            className="shrink-0 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 text-primary px-3 py-2 text-xs font-medium hover:bg-primary/10 transition-colors"
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span className="flex-1 text-left">{t('investigation.viewLastReport')}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}

        <Button
          onClick={handleAcceptAndContinue}
          disabled={!description.trim() || (!generateReport ? false : !apiKey)}
          className="shrink-0 w-full h-11 font-semibold gap-2 text-sm"
        >
          {generateReport ? <Sparkles className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          {generateReport
            ? t('investigation.analyzeAndSearch')
            : t('investigation.acceptAndContinue')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ── AI Report Modal (full-panel overlay) ── */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{t('investigation.reportModalTitle')}</h3>
            </div>
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable report content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
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
                    <span className="text-primary mt-0.75 shrink-0">▸</span>
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

          {/* Footer: start search */}
          <div className="shrink-0 px-4 py-3 border-t border-border space-y-2">
            <Button
              className="w-full h-11 font-semibold gap-2 text-sm"
              onClick={async () => {
                setReportModalOpen(false)
                await handleStartScraping(currentInvIdRef.current)
              }}
            >
              <Globe className="w-4 h-4" />
              {t('investigation.startSearchFromReport')}
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 text-xs gap-1.5"
              onClick={() => setReportModalOpen(false)}
            >
              {t('investigation.modifyFilters')}
            </Button>
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}
