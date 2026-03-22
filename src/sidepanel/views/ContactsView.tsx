import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Send,
  Star,
  Globe,
  Tag,
  User2,
  Info,
  MessageSquarePlus,
  Plus,
  CheckCircle2,
  XCircle,
  Scan,
  X,
  AlertTriangle,
  Search,
  Pause,
  Play,
  Square,
  Trash2,
  Bot,
  Loader2,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Progress } from '@components/ui/progress'
import { Label } from '@components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip'
import { TruncatedText } from '@components/ui/truncated-text'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { useInvestigationStore } from '@store/investigation.store'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import type { Contact, ContactCategory } from '@core/types/contact.types'
import type { TabId } from '@components/layout/Navigation'
import { getAIProvider } from '@services/ai.service'
import { createOutreachService } from '@services/outreach'
import { isSimulation } from '@services/runtime.service'
import { useBusinessStore } from '@store/business.store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'

// ─── Category display mapping for real ContactCategory values ────────────────────────────────────

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  journalist: 'Periodismo',
  'investigative-reporter': 'Periodismo',
  ngo: 'ONG',
  'legal-advocate': 'Asesoría Legal',
  researcher: 'Investigación',
  activist: 'Activismo',
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Periodismo: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  ONG: 'bg-green-500/10 text-green-400 border-green-500/30',
  Investigación: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Asesoría Legal': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Think Tank': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
}

const MOCK_TO_CATEGORY: Record<string, ContactCategory> = {
  Periodismo: 'journalist',
  ONG: 'ngo',
  Investigación: 'researcher',
  'Asesoría Legal': 'legal-advocate',
  'Think Tank': 'researcher',
}

interface MockContact {
  id: string
  company: string
  category: string
  website: string
  email: string
  role: string
  specialization: string
  topics: string[]
  region: string
  score: number
  contactPage: string
  discarded?: boolean
  // Form-centric fields
  contactFormUrl?: string | null
  contactMethod?: 'form' | 'email' | 'both' | 'none'
  formFieldCount?: number
  hasCaptcha?: boolean
}

const MOCK_CONTACTS: MockContact[] = [
  {
    id: 'mc-1',
    company: 'TechInsight Media',
    category: 'Periodismo',
    website: 'www.techinsight.com',
    email: 'editorial@techinsight.com',
    role: 'Editor Jefe',
    specialization: 'Tecnología e Inteligencia Artificial',
    topics: ['IA', 'Privacidad', 'Big Data'],
    region: 'España',
    score: 87,
    contactPage: 'www.techinsight.com/contacto',
  },
  {
    id: 'mc-2',
    company: 'EcoFund Global',
    category: 'ONG',
    website: 'www.ecofundglobal.org',
    email: 'info@ecofundglobal.org',
    role: 'Director de Comunicación',
    specialization: 'Sostenibilidad y Medioambiente',
    topics: ['Medio Ambiente', 'Financiación Verde', 'ESG'],
    region: 'Europa',
    score: 74,
    contactPage: 'www.ecofundglobal.org/contact',
  },
  {
    id: 'mc-3',
    company: 'Transparency Watch EU',
    category: 'Investigación',
    website: 'www.transparencywatch.eu',
    email: 'press@transparencywatch.eu',
    role: 'Investigadora Senior',
    specialization: 'Corrupción y Transparencia Institucional',
    topics: ['Corrupción', 'Lobbying', 'Datos Abiertos'],
    region: 'UE',
    score: 92,
    contactPage: 'www.transparencywatch.eu/press',
  },
  {
    id: 'mc-4',
    company: 'Open Justice Foundation',
    category: 'Asesoría Legal',
    website: 'www.openjustice.org',
    email: 'legal@openjustice.org',
    role: 'Abogado Principal',
    specialization: 'Derechos Digitales y Libertad de Expresión',
    topics: ['Derechos Digitales', 'RGPD', 'Ciberseguridad'],
    region: 'Internacional',
    score: 68,
    contactPage: 'www.openjustice.org/contact',
  },
  {
    id: 'mc-5',
    company: 'DataDriven Research Institute',
    category: 'Think Tank',
    website: 'www.datadrivenresearch.io',
    email: 'hello@datadrivenresearch.io',
    role: 'Responsable de Alianzas',
    specialization: 'Análisis de Datos y Políticas Públicas',
    topics: ['Datos', 'Gobierno Abierto', 'Innovación'],
    region: 'Global',
    score: 81,
    contactPage: 'www.datadrivenresearch.io/contact',
  },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${cls}`}
    >
      <Tag className="w-2.5 h-2.5" />
      {category}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-primary' : score >= 60 ? 'text-yellow-400' : 'text-muted-foreground'
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Índice de Afinidad
        </span>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-50 text-center leading-snug text-xs">
              Puntuación calculada por la IA según la afinidad temática entre tu perfil y este
              contacto. Mayor porcentaje = mayor potencial de colaboración.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2">
        <Star className={`w-3 h-3 shrink-0 ${color}`} />
        <Progress value={score} className="flex-1 h-1.5" />
        <span className={`text-[11px] font-bold tabular-nums ${color}`}>{score}%</span>
      </div>
    </div>
  )
}

function MessageComposer({
  contact,
  context,
  preFill,
}: {
  contact: MockContact
  context: string
  preFill?: { subject: string; body: string }
}) {
  const { companyName, phone, email: senderEmail } = useBusinessStore()
  const [subject, setSubject] = useState(preFill?.subject ?? '')
  const [body, setBody] = useState(preFill?.body ?? '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Sync fields when AI bulk pre-fill data arrives
  useEffect(() => {
    if (preFill) {
      setSubject(preFill.subject)
      setBody(preFill.body)
    }
  }, [preFill])

  // Send pipeline state
  type SendStatus = 'idle' | 'sending' | 'done' | 'error'
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendProgress, setSendProgress] = useState<{ step: string; pct: number }>({ step: '', pct: 0 })
  const [sendConfirm, setSendConfirm] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Determine primary send channel
  const isFormContact =
    contact.contactMethod === 'form' || contact.contactMethod === 'both'
  const canSendViaForm = isFormContact && !!contact.contactFormUrl
  const canSendViaEmail = !!contact.email

  // Listen for FORM_SUBMIT_PROGRESS and FORM_SUBMIT_DONE from background
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
    const handler = (msg: { type: string; payload: unknown }) => {
      if (!msg?.type) return
      const p = msg.payload as Record<string, unknown>
      if (p?.contactId !== contact.id) return

      if (msg.type === MessageType.FORM_SUBMIT_PROGRESS) {
        setSendStatus('sending')
        setSendProgress({ step: p.step as string, pct: p.pct as number })
      } else if (msg.type === MessageType.FORM_SUBMIT_DONE) {
        if (p.success) {
          setSendStatus('done')
          setSendConfirm((p.confirmText as string | undefined) ?? 'Formulario enviado correctamente')
        } else {
          setSendStatus('error')
          setSendError((p.error as string | undefined) ?? 'Error desconocido al enviar')
        }
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [contact.id])

  const resetSend = useCallback(() => {
    setSendStatus('idle')
    setSendProgress({ step: '', pct: 0 })
    setSendConfirm(null)
    setSendError(null)
  }, [])

  async function handleGenerateWithAI() {
    setAiLoading(true)
    setAiError(null)
    try {
      const provider = getAIProvider()
      const fullContact: Contact = {
        id: contact.id,
        name: contact.company,
        role: contact.role || 'Professional',
        organization: contact.company,
        email: contact.email,
        website: contact.website,
        contactPage: contact.contactPage,
        specialization: contact.specialization,
        topics: contact.topics,
        region: contact.region,
        recentArticles: [],
        category: 'researcher',
        relevanceScore: contact.score,
        investigationId: '',
        contactMethod: contact.contactMethod,
        contactFormUrl: contact.contactFormUrl,
      }
      // Append sender identity so the AI can build a proper email signature
      const senderLines = [
        companyName ? `Company: ${companyName}` : '',
        senderEmail ? `Email: ${senderEmail}` : '',
        phone ? `Phone: ${phone}` : '',
      ].filter(Boolean)
      const enrichedContext = [
        context || 'Professional outreach and collaboration opportunity.',
        senderLines.length ? `\nSENDER INFO (for email signature):\n${senderLines.join('\n')}` : '',
      ]
        .join('')
        .trim()
      const result = await provider.generateMessages(fullContact, enrichedContext)
      if (result.success && result.data) {
        // Use contactFormMessage as body when contact has a form, but always use emailSubject
        const isFormFirst = contact.contactMethod === 'form' || contact.contactMethod === 'both'
        setSubject(result.data.emailSubject ?? '')
        setBody(isFormFirst ? result.data.contactFormMessage : result.data.emailBody)
      } else {
        setAiError('No se pudo generar el mensaje. Verifica la configuración de IA.')
      }
    } catch {
      setAiError('Error al conectar con la IA.')
    }
    setAiLoading(false)
  }

  async function handleSend() {
    if (!body.trim()) return
    resetSend()

    // ── Simulation mode: convincing fake animation, zero real outreach ──────
    // Intercepts BOTH form and email paths so no real data reaches recipients.
    if (isSimulation()) {
      setSendStatus('sending')
      const steps = canSendViaForm
        ? [
            { step: 'Accediendo al formulario de contacto…', pct: 15 },
            { step: 'Rellenando campos del formulario…', pct: 50 },
            { step: 'Enviando datos del formulario…', pct: 85 },
          ]
        : [
            { step: 'Preparando mensaje de correo…', pct: 20 },
            { step: 'Conectando con el servidor de correo…', pct: 55 },
            { step: 'Transmitiendo mensaje…', pct: 85 },
          ]
      for (const s of steps) {
        setSendProgress(s)
        await new Promise<void>((r) => setTimeout(r, 650))
      }
      setSendStatus('done')
      setSendConfirm('[SIMULACIÓN] Mensaje no enviado — modo de pruebas activo')
      return
    }

    // ── Real channels (staging / production) ─────────────────────────────────
    if (canSendViaForm) {
      // ── Form submission pipeline ──────────────────────────────────────────
      setSendStatus('sending')
      setSendProgress({ step: 'Iniciando envío…', pct: 2 })
      await messageService.send(MessageType.FORM_SUBMIT_START, {
        contactId: contact.id,
        contactFormUrl: contact.contactFormUrl!,
        formData: {
          nombre: companyName || undefined,
          email: senderEmail || undefined,
          empresa: companyName || undefined,
          telefono: phone || undefined,
          asunto: subject.trim() || undefined,
          mensaje: body.trim(),
        },
      })
      // Progress updates arrive via chrome.runtime.onMessage listener above
    } else if (canSendViaEmail) {
      // ── Email via mailto (production only) ───────────────────────────────
      try {
        setSendStatus('sending')
        setSendProgress({ step: 'Enviando mensaje…', pct: 50 })
        const fullContact: Contact = {
          id: contact.id,
          name: contact.company,
          role: contact.role || 'Professional',
          organization: contact.company,
          email: contact.email,
          website: contact.website,
          contactPage: contact.contactPage,
          specialization: contact.specialization,
          topics: contact.topics,
          region: contact.region,
          recentArticles: [],
          category: 'researcher',
          relevanceScore: contact.score,
          investigationId: '',
          contactMethod: contact.contactMethod,
          contactFormUrl: contact.contactFormUrl,
        }
        const outreach = createOutreachService()
        const result = await outreach.sendEmail(fullContact, subject.trim(), body.trim())
        if (result.success) {
          setSendStatus('done')
          setSendConfirm('Cliente de correo abierto con el mensaje pre-rellenado')
        } else {
          setSendStatus('error')
          setSendError(result.error ?? 'Error al enviar el mensaje')
        }
      } catch (e) {
        setSendStatus('error')
        setSendError((e as Error).message ?? 'Error desconocido')
      }
    } else {
      setSendStatus('error')
      setSendError('Este contacto no tiene formulario ni email de contacto disponible')
    }
  }

  // Require both subject and body for all channels
  const canSend = !!body.trim() && !!subject.trim()

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 min-w-0 overflow-hidden flex-1">
          <MessageSquarePlus className="w-3 h-3 shrink-0" />
          <span className="shrink-0">Nuevo mensaje ·</span>
          <span className="text-primary normal-case font-normal truncate min-w-0">
            {canSendViaForm ? contact.contactFormUrl?.replace(/^https?:\/\//, '') : contact.email}
          </span>
        </p>
        <div className="flex items-center gap-1">
          {/* Simulation badge — shown when test mode is active */}
          {isSimulation() && (
            <span className="text-[9px] font-bold uppercase tracking-wide border border-amber-500/50 text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5 shrink-0">
              TEST
            </span>
          )}
          {/* Channel badge */}
          {!isSimulation() && (canSendViaForm ? (
            <span className="text-[9px] border border-emerald-500/40 text-emerald-400 rounded px-1">
              formulario
            </span>
          ) : canSendViaEmail ? (
            <span className="text-[9px] border border-blue-500/40 text-blue-400 rounded px-1">
              email
            </span>
          ) : null)}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={handleGenerateWithAI}
                  disabled={aiLoading || sendStatus === 'sending'}
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {aiLoading ? 'Generando…' : 'Generar con IA'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {aiError && <p className="text-[10px] text-destructive">{aiError}</p>}

      <Input
        placeholder="Asunto del mensaje…"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="h-7 text-xs"
        disabled={sendStatus === 'sending'}
      />

      <Textarea
        placeholder="Escribe tu mensaje aquí… o pulsa 'Generar con IA'"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="text-xs min-h-18 resize-none"
        disabled={sendStatus === 'sending'}
      />

      {/* Send button row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {body.length > 0 ? `${body.length} caracteres` : 'Campo vacío'}
        </p>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          disabled={!canSend || sendStatus === 'sending'}
          onClick={sendStatus === 'done' || sendStatus === 'error' ? resetSend : handleSend}
        >
          {sendStatus === 'sending' ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Enviando…
            </>
          ) : sendStatus === 'done' ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              ✓ Enviado
            </>
          ) : sendStatus === 'error' ? (
            <>
              <XCircle className="w-3 h-3" />
              Reintentar
            </>
          ) : (
            <>
              <Send className="w-3 h-3" />
              Enviar
            </>
          )}
        </Button>
      </div>

      {/* Live progress overlay */}
      {sendStatus === 'sending' && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
            <span className="text-[11px] text-primary leading-snug">{sendProgress.step}</span>
          </div>
          <Progress value={sendProgress.pct} className="h-1.5" />
          <p className="text-[9px] text-muted-foreground text-right">{sendProgress.pct}%</p>
        </div>
      )}

      {/* Success confirmation */}
      {sendStatus === 'done' && sendConfirm && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-400 leading-snug">{sendConfirm}</p>
        </div>
      )}

      {/* Error feedback */}
      {sendStatus === 'error' && sendError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-start gap-2">
          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-snug">{sendError}</p>
        </div>
      )}
    </div>
  )
}

function ContactCard({
  contact,
  onDelete,
  context,
  preFill,
}: {
  contact: MockContact
  onDelete?: () => void
  context: string
  preFill?: { subject: string; body: string }
}) {
  const [open, setOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  return (
    <div
      className={`rounded-xl border overflow-hidden animate-fade-in ${contact.discarded ? 'border-amber-500/30 bg-amber-500/3' : 'border-border'}`}
    >
      {/* Header row */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-0 cursor-pointer transition-colors ${open ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="px-3 py-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            {contact.discarded && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="Baja relevancia"
              />
            )}
            <p className="text-xs font-medium truncate">{contact.company}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors overflow-hidden"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{contact.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {contact.website}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="px-3 py-2.5 flex flex-col items-end gap-1">
          <CategoryBadge category={contact.category} />
          {contact.contactMethod === 'form' || contact.contactMethod === 'both' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                ✓ Formulario
              </span>
            ) : contact.contactMethod === 'email' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-blue-500/15 text-blue-400 border-blue-500/20">
                ✉ Email
              </span>
            ) : contact.contactMethod === 'none' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-muted text-muted-foreground border-border">
                Sin contacto
              </span>
            ) : null}
        </div>
        <div className="px-2 flex items-center justify-center w-8">
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="px-4 pb-4 bg-primary/5 border-t border-primary/10">
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Rol
                </span>
                <TruncatedText text={contact.role || 'Indefinido'} className="font-medium text-xs" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Región
                </span>
                <TruncatedText text={contact.region} className="font-medium text-xs" />
              </div>
              <div className="col-span-2 flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Especialización
                </span>
                <TruncatedText text={contact.specialization} className="font-medium text-xs" />
              </div>
              <div className="col-span-2 flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Email
                </span>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`mailto:${contact.email}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1 overflow-hidden text-xs"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {contact.email}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {contact.topics.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>

            <ScoreBar score={contact.score} />

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => window.open(contact.website.startsWith('http') ? contact.website : `https://${contact.website}`, '_blank')}
              >
                <Globe className="w-3 h-3" />
                Visitar sitio
              </Button>
              <Button
                size="sm"
                variant={msgOpen ? 'secondary' : 'default'}
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => setMsgOpen((v) => !v)}
              >
                <MessageSquarePlus className="w-3 h-3" />
                Mensaje
                {msgOpen ? (
                  <ChevronUp className="w-3 h-3 ml-auto" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-auto" />
                )}
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                  title="Eliminar contacto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

              {msgOpen && <MessageComposer contact={contact} context={context} preFill={preFill} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────────────────────────

interface ContactsViewProps {
  onNavigate: (tab: TabId) => void
}

export function ContactsView({ onNavigate }: ContactsViewProps) {
  const { createCampaign, campaigns } = useCampaignStore()
  const { contacts: allStoreContacts, addContacts, deleteContact, hasEverAddedContact, hiddenMockContactIds, hideMockContact } = useContactsStore()
  const { companyName: senderCompanyName, phone: senderPhone, email: senderEmailFill } = useBusinessStore()
  const {
    currentId,
    getCurrent,
    lastFinishReason,
    setLastFinishReason,
    liveScrapingStatus,
    liveContactsFound,
    liveCurrentUrl,
    liveScrapingTotal,
    livePagesScanned,
    liveDomainsChecked,
    liveFormsFound,
    liveCurrentDomain,
  } = useInvestigationStore()

  // Block duplicate campaigns for the same investigation
  const existingCampaign = campaigns.find((c) => c.investigationId === currentId && currentId)
  const alreadyHasCampaign = !!existingCampaign

  // Get contacts belonging to the current investigation from the store
  const investigationContacts = currentId
    ? allStoreContacts.filter((c) => c.investigationId === currentId)
    : []

  // Build the display list: real contacts from the store, or mock data as fallback.
  // Once hasEverAddedContact is true (persisted), never fall back to mock data — show
  // the real empty state instead so deleted items don't reappear.
  const hasRealContacts = investigationContacts.length > 0
  const investigationContext = getCurrent()?.prompt ?? ''

  // hiddenMockContactIds is persisted in the contacts store — survives tab navigation and extension reloads

  const allDisplayContacts: MockContact[] = hasRealContacts
    ? investigationContacts.map((c) => ({
        id: c.id,
        company: c.organization || c.name,
        category:
          CATEGORY_DISPLAY_NAMES[c.category] ??
          Object.entries(MOCK_TO_CATEGORY).find(([, v]) => v === c.category)?.[0] ??
          c.category,
        website: c.website,
        email: c.email,
        role: c.role,
        specialization: c.specialization,
        topics: c.topics,
        region: c.region,
        score: c.relevanceScore,
        contactPage: c.contactPage,
        discarded: c.discarded,
        contactFormUrl: c.contactFormUrl,
        contactMethod: c.contactMethod,
        formFieldCount: c.formFields?.length ?? 0,
        hasCaptcha: c.hasCaptcha,
      }))
    : hasEverAddedContact
      ? []
        : MOCK_CONTACTS.filter((c) => !hiddenMockContactIds.includes(c.id))
  const relevantContacts = allDisplayContacts.filter((c) => !c.discarded)
  const otherContacts = allDisplayContacts.filter((c) => c.discarded)

  // Tab state: 'relevant' or 'others'
  const [activeTab, setActiveTab] = useState<'relevant' | 'others'>('relevant')
  const displayContacts = activeTab === 'relevant' ? relevantContacts : otherContacts

  // ── Cascade scraping simulation — re-runs every time currentId changes
  // Contacts are shown immediately; the cascade effect happens live
  // during scraping via SCRAPING_CONTACT messages adding to the store one by one.

  function handleDeleteContact(id: string) {
    const existsInStore = allStoreContacts.some((c) => c.id === id)
    if (existsInStore) {
      deleteContact(id)
    } else {
      hideMockContact(id)
    }
  }

  // ── AI bulk pre-fill (generate subject+body for all contacts at once)
  const [aiPreFills, setAiPreFills] = useState<Map<string, { subject: string; body: string }>>(
    new Map(),
  )
  const [aiFillingAll, setAiFillingAll] = useState(false)
  const [aiFilledCount, setAiFilledCount] = useState(0)

  async function handleAIFillAll() {
    if (aiFillingAll || allDisplayContacts.length === 0) return
    setAiFillingAll(true)
    setAiFilledCount(0)
    const provider = getAIProvider()
    const senderLines = [
      senderCompanyName ? `Company: ${senderCompanyName}` : '',
      senderEmailFill ? `Email: ${senderEmailFill}` : '',
      senderPhone ? `Phone: ${senderPhone}` : '',
    ].filter(Boolean)
    const enrichedContext = [
      investigationContext || 'Professional outreach and collaboration opportunity.',
      senderLines.length ? `\nSENDER INFO (for email signature):\n${senderLines.join('\n')}` : '',
    ]
      .join('')
      .trim()
    const newFills = new Map<string, { subject: string; body: string }>()
    for (let i = 0; i < allDisplayContacts.length; i++) {
      const c = allDisplayContacts[i]
      try {
        const fullContact: Contact = {
          id: c.id,
          name: c.company,
          role: c.role || 'Professional',
          organization: c.company,
          email: c.email,
          website: c.website,
          contactPage: c.contactPage,
          specialization: c.specialization,
          topics: c.topics,
          region: c.region,
          recentArticles: [],
          category: 'researcher',
          relevanceScore: c.score,
          investigationId: '',
          contactMethod: c.contactMethod,
          contactFormUrl: c.contactFormUrl,
        }
        const result = await provider.generateMessages(fullContact, enrichedContext)
        if (result.success && result.data) {
          const isFormFirst = c.contactMethod === 'form' || c.contactMethod === 'both'
          newFills.set(c.id, {
            subject: result.data.emailSubject ?? '',
            body: isFormFirst ? result.data.contactFormMessage : result.data.emailBody,
          })
          setAiPreFills(new Map(newFills))
        }
      } catch {
        // Skip contacts where AI generation fails silently
      }
      setAiFilledCount(i + 1)
    }
    setAiFillingAll(false)
  }

  // ── Add contact manually
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newContactForm, setNewContactForm] = useState({
    company: '',
    email: '',
    website: '',
    role: '',
    category: 'researcher',
    region: '',
    topicsText: '',
  })

  function resetAddContactForm() {
    setNewContactForm({
      company: '',
      email: '',
      website: '',
      role: '',
      category: 'researcher',
      region: '',
      topicsText: '',
    })
  }

  function handleAddContact() {
    if (!newContactForm.company.trim() || !newContactForm.email.trim()) return
    const contactToAdd: Contact = {
      id: crypto.randomUUID(),
      name: newContactForm.company.trim(),
      organization: newContactForm.company.trim(),
      email: newContactForm.email.trim(),
      website: newContactForm.website.trim() || '',
      role: newContactForm.role.trim() || '',
      contactPage: newContactForm.website.trim()
        ? `${newContactForm.website.trim()}/contact`
        : '',
      specialization: '',
      topics: newContactForm.topicsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      region: newContactForm.region.trim() || '',
      recentArticles: [],
      category: newContactForm.category as ContactCategory,
      relevanceScore: 0,
      investigationId: currentId ?? '',
      contactMethod: 'email',
      contactFormUrl: null,
      discarded: false,
    }
    addContacts([contactToAdd])
    resetAddContactForm()
    setAddContactOpen(false)
  }

  // ── Confirm clear all contacts
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  function handleClearAllContacts() {
    if (hasRealContacts) {
      investigationContacts.forEach((c) => deleteContact(c.id))
    } else {
      MOCK_CONTACTS.filter((c) => !hiddenMockContactIds.includes(c.id)).forEach((c) =>
        hideMockContact(c.id),
      )
    }
    setConfirmClearAll(false)
    setAiPreFills(new Map())
  }

  // ── Campaign modal state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [campName, setCampName] = useState('')
  const [campSubject, setCampSubject] = useState('')
  const [campBody, setCampBody] = useState('')
  const [campSaved, setCampSaved] = useState(false)

  function resetModal() {
    setCampName('')
    setCampSubject('')
    setCampBody('')
    setCampSaved(false)
    setSelectedContactIds(new Set())
  }

  function openModal() {
    // Pre-select relevant contacts; if none, pre-select all available contacts
    const preselect = relevantContacts.length > 0 ? relevantContacts : allDisplayContacts
    setSelectedContactIds(new Set(preselect.map((c) => c.id)))
    setModalOpen(true)
  }

  function handleCreateCampaign() {
    if (!campName.trim() || selectedContactIds.size === 0) return
    const inv = getCurrent()
    const selectedContacts = allDisplayContacts.filter((c) => selectedContactIds.has(c.id))

    // Persist contacts to the store only if they're mock (real ones are already persisted)
    if (!hasRealContacts) {
      const contactsToSave: Contact[] = selectedContacts.map((c) => ({
        id: c.id,
        name: c.company,
        role: c.role,
        organization: c.company,
        email: c.email,
        website: c.website,
        contactPage: c.contactPage,
        specialization: c.specialization,
        topics: c.topics,
        region: c.region,
        recentArticles: [],
        category: MOCK_TO_CATEGORY[c.category] ?? 'researcher',
        relevanceScore: c.score,
        investigationId: currentId ?? '',
      }))
      addContacts(contactsToSave)
    }

    createCampaign({
      name: campName.trim(),
      investigationId: currentId ?? '',
      prompt: inv?.prompt ?? campBody.trim(),
      status: 'draft',
      contactIds: [...selectedContactIds],
      messages: [],
    })

    setCampSaved(true)
    setTimeout(() => {
      setModalOpen(false)
      resetModal()
      onNavigate('campaigns')
    }, 1400)
  }

  // Finish reason display text
  const FINISH_REASON_TEXT: Record<string, string> = {
    'energy-exhausted': 'El rastreo se detuvo porque se agotó la energía.',
    'queries-exhausted': 'Se agotaron todas las búsquedas de Google sin alcanzar el objetivo.',
    stalled: 'El rastreo se detuvo inesperadamente. Puedes intentar de nuevo.',
    'max-pages': 'Se alcanzó el límite de páginas escaneadas sin cubrir el objetivo.',
  }

  return (
    <div className="flex flex-col flex-1">
      {/* ── Live scraping progress (shows while scraping is running / paused) */}
      {liveScrapingStatus !== 'idle' && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Globe
                  className={`w-4 h-4 text-primary ${liveScrapingStatus === 'running' ? 'animate-pulse' : ''}`}
                />
              </div>
              <p className="text-xs font-semibold">
                {liveScrapingStatus === 'paused' ? 'Rastreo pausado' : 'Rastreando la web…'}
              </p>
            </div>
            <span className="text-xs font-bold text-primary tabular-nums">
              {liveContactsFound} contactos
            </span>
          </div>

          {liveScrapingTotal > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Páginas analizadas</span>
                <span className="tabular-nums">
                  {livePagesScanned} / {Math.min(liveScrapingTotal * 5, 500)}
                </span>
              </div>
              <Progress
                value={Math.min(
                  Math.min(liveScrapingTotal * 5, 500) > 0
                    ? (livePagesScanned / Math.min(liveScrapingTotal * 5, 500)) * 100
                    : 0,
                  99,
                )}
                className="h-1.5"
              />
              <div className="flex gap-3 text-[10px] text-muted-foreground pt-0.5">
                <span className="tabular-nums">🌐 {liveDomainsChecked} dominios</span>
                <span className="tabular-nums">📋 {liveFormsFound} formularios</span>
              </div>
            </div>
          )}

          {liveCurrentDomain && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-2.5 h-2.5 text-emerald-500 shrink-0 animate-pulse" />
              <span className="text-[10px] text-muted-foreground truncate">{liveCurrentDomain}</span>
            </div>
          )}

          {liveCurrentUrl && (
            <div className="flex items-center gap-1.5">
              <Search className="w-2.5 h-2.5 text-primary shrink-0 animate-pulse" />
              <span className="text-[10px] text-muted-foreground truncate">{liveCurrentUrl}</span>
            </div>
          )}

          {/* Pause / Resume / Cancel */}
          <div className="flex gap-2 pt-1 border-t border-border/40">
            {liveScrapingStatus === 'running' ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() =>
                  messageService
                    .send(MessageType.SCRAPING_PAUSE, { invId: currentId ?? '' })
                    .catch(() => {})
                }
              >
                <Pause className="w-3 h-3" />
                Pausar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5 border-primary/40 text-primary"
                onClick={() =>
                  messageService
                    .send(MessageType.SCRAPING_RESUME, { invId: currentId ?? '' })
                    .catch(() => {})
                }
              >
                <Play className="w-3 h-3" />
                Continuar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() =>
                messageService
                  .send(MessageType.SCRAPING_CANCEL, { invId: currentId ?? '' })
                  .catch(() => {})
              }
            >
              <Square className="w-3 h-3" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ── Finish reason notification banner */}
      {lastFinishReason && lastFinishReason !== 'target-reached' && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-amber-600 leading-snug">
              {FINISH_REASON_TEXT[lastFinishReason] ?? 'El rastreo finalizó antes de lo esperado.'}
            </p>
          </div>
          <button
            onClick={() => setLastFinishReason(null)}
            className="shrink-0 text-amber-500 hover:text-amber-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Contactos encontrados
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground font-medium">
              {allDisplayContacts.length} total
            </span>
            {/* AI bulk fill all contacts */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={handleAIFillAll}
                    disabled={aiFillingAll || allDisplayContacts.length === 0}
                  >
                    {aiFillingAll ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {aiFillingAll
                    ? `Generando ${aiFilledCount}/${allDisplayContacts.length}…`
                    : 'Generar mensajes con IA para todos'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Add contact manually */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => setAddContactOpen(true)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Añadir contacto manualmente
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Delete all contacts */}
            {allDisplayContacts.length > 0 &&
              (confirmClearAll ? (
                <div className="flex items-center gap-1.5">
                  <button
                    className="text-[10px] text-destructive font-semibold hover:underline"
                    onClick={handleClearAllContacts}
                  >
                    Borrar todo
                  </button>
                  <button
                    className="text-[10px] text-muted-foreground hover:underline"
                    onClick={() => setConfirmClearAll(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmClearAll(true)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Borrar lista completa
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
          </div>
        </div>
        {aiFillingAll && (
          <div className="flex items-center gap-2 mb-1.5">
            <Progress
              value={(aiFilledCount / allDisplayContacts.length) * 100}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {aiFilledCount}/{allDisplayContacts.length}
            </span>
          </div>
        )}
        <Progress value={100} className="h-1" />
      </div>

      {/* ── Tabs: Relevant / Others */}
      {otherContacts.length > 0 && (
        <div className="flex gap-1 mb-3 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab('relevant')}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
              activeTab === 'relevant'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Relevantes ({relevantContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('others')}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
              activeTab === 'others'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Otros ({otherContacts.length})
          </button>
        </div>
      )}

      {/* ── Contacts list */}
      <div className="space-y-2 flex-1">
        {displayContacts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center gap-2">
            <Scan className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No hay contactos todavía…</p>
          </div>
        )}
        {displayContacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onDelete={() => handleDeleteContact(contact.id)}
            context={investigationContext}
            preFill={aiPreFills.get(contact.id)}
          />
        ))}
      </div>

      {/* ── Fixed bottom button */}
      <div className="sticky bottom-0 -mx-4 px-4 mt-4 bg-background border-t border-border">
        {alreadyHasCampaign ? (
          <div className="px-0 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-400 truncate">
                  {existingCampaign!.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Campaña ya creada para esta lista
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs shrink-0"
              onClick={() => onNavigate('campaigns')}
            >
              Ver campaña
            </Button>
          </div>
        ) : (
          <div className="py-3">
            <Button className="w-full gap-2" onClick={openModal}>
              <Plus className="w-4 h-4" />
              Crear Campaña
            </Button>
          </div>
        )}
      </div>

      {/* ── Create Campaign — centered modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false)
              resetModal()
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-[calc(100%-20px)] max-h-[calc(100vh-40px)] overflow-y-auto">
            {campSaved ? (
              <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">¡Campaña creada!</p>
                  <p className="text-xs text-muted-foreground mt-1">Redirigiendo a Campañas…</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Plus className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">Nueva Campaña</h3>
                    <p className="text-[11px] text-muted-foreground">
                        {selectedContactIds.size} contactos seleccionados
                    </p>
                  </div>
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    onClick={() => {
                      setModalOpen(false)
                      resetModal()
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Form */}
                <div className="px-5 py-4 space-y-3">
{/* ── Contact selection checklist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <User2 className="w-3 h-3" />
                          Contactos a incluir
                        </Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline"
                            onClick={() =>
                              setSelectedContactIds(new Set(allDisplayContacts.map((c) => c.id)))
                            }
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground hover:underline"
                            onClick={() => setSelectedContactIds(new Set())}
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden max-h-44 overflow-y-auto">
                        {allDisplayContacts.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No hay contactos disponibles
                          </p>
                        ) : (
                          [...relevantContacts, ...otherContacts].map((c) => {
                            const isSelected = selectedContactIds.has(c.id)
                            return (
                              <div
                                key={c.id}
                                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-b border-border last:border-b-0 select-none ${
                                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                                }`}
                                onClick={() =>
                                  setSelectedContactIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(c.id)) next.delete(c.id)
                                    else next.add(c.id)
                                    return next
                                  })
                                }
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-primary border-primary'
                                      : 'border-muted-foreground/40'
                                  }`}
                                >
                                  {isSelected && (
                                    <svg
                                      className="w-2.5 h-2.5 text-white"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <span className="flex-1 text-xs font-medium truncate">{c.company}</span>
                                {c.discarded && (
                                  <span className="text-[9px] text-amber-400 border border-amber-400/30 rounded px-1 shrink-0">
                                    Otro
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                                  {c.score}%
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedContactIds.size} contacto
                        {selectedContactIds.size !== 1 ? 's' : ''} seleccionado
                        {selectedContactIds.size !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Nombre de la campaña *
                    </Label>
                    <Input
                      placeholder="ej. Outreach Tech Media 2026…"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="h-9 text-sm bg-background"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Asunto del email
                    </Label>
                    <Input
                      placeholder="Asunto que verán los destinatarios…"
                      value={campSubject}
                      onChange={(e) => setCampSubject(e.target.value)}
                      className="h-9 text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Mensaje base
                    </Label>
                    <Textarea
                      placeholder="La IA personalizará este mensaje para cada contacto…"
                      value={campBody}
                      onChange={(e) => setCampBody(e.target.value)}
                      className="text-sm min-h-18 resize-none bg-background"
                    />
                  </div>
                </div>

                {/* ── Footer */}
                <div className="px-5 py-4 flex gap-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="h-10 px-4 text-sm"
                    onClick={() => {
                      setModalOpen(false)
                      resetModal()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 h-10 text-sm gap-2"
                    disabled={!campName.trim() || selectedContactIds.size === 0}
                    onClick={handleCreateCampaign}
                  >
                    <Plus className="w-4 h-4" />
                    Guardar campaña
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Contact — manual entry modal */}
      {addContactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAddContactOpen(false)
              resetAddContactForm()
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-[calc(100%-20px)] max-h-[calc(100vh-40px)] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <User2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">Nuevo Contacto</h3>
                <p className="text-[11px] text-muted-foreground">Añadir contacto manualmente</p>
              </div>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => {
                  setAddContactOpen(false)
                  resetAddContactForm()
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Form */}
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Empresa / Nombre *
                  </Label>
                  <Input
                    placeholder="Nombre de la empresa o persona…"
                    value={newContactForm.company}
                    onChange={(e) => setNewContactForm((p) => ({ ...p, company: e.target.value }))}
                    className="h-9 text-sm bg-background"
                    autoFocus
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sitio Web
                  </Label>
                  <Input
                    placeholder="https://empresa.com"
                    value={newContactForm.website}
                    onChange={(e) => setNewContactForm((p) => ({ ...p, website: e.target.value }))}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Rol
                  </Label>
                  <Input
                    placeholder="Director, Editor…"
                    value={newContactForm.role}
                    onChange={(e) => setNewContactForm((p) => ({ ...p, role: e.target.value }))}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Categoría
                  </Label>
                  <Select
                    value={newContactForm.category}
                    onValueChange={(v) => setNewContactForm((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="journalist">Periodismo</SelectItem>
                      <SelectItem value="investigative-reporter">Periodismo Investigativo</SelectItem>
                      <SelectItem value="ngo">ONG</SelectItem>
                      <SelectItem value="legal-advocate">Asesoría Legal</SelectItem>
                      <SelectItem value="researcher">Investigación</SelectItem>
                      <SelectItem value="activist">Activismo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Región
                  </Label>
                  <Input
                    placeholder="España, Europa…"
                    value={newContactForm.region}
                    onChange={(e) => setNewContactForm((p) => ({ ...p, region: e.target.value }))}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Temas (separados por coma)
                  </Label>
                  <Input
                    placeholder="IA, Privacidad, Big Data…"
                    value={newContactForm.topicsText}
                    onChange={(e) =>
                      setNewContactForm((p) => ({ ...p, topicsText: e.target.value }))
                    }
                    className="h-9 text-sm bg-background"
                  />
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="px-5 py-4 flex gap-2 border-t border-border/50">
              <Button
                variant="outline"
                className="h-10 px-4 text-sm"
                onClick={() => {
                  setAddContactOpen(false)
                  resetAddContactForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-10 text-sm gap-2"
                disabled={!newContactForm.company.trim() || !newContactForm.email.trim()}
                onClick={handleAddContact}
              >
                <Plus className="w-4 h-4" />
                Añadir contacto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
