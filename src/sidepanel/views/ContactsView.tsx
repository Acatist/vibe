import { useState } from 'react'
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
  Scan,
  X,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Progress } from '@components/ui/progress'
import { Label } from '@components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { useInvestigationStore } from '@store/investigation.store'
import type { Contact, ContactCategory } from '@core/types/contact.types'
import type { TabId } from '@components/layout/Navigation'

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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}
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
            <TooltipContent className="max-w-[200px] text-center leading-snug text-xs">
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

function MessageComposer({ email }: { email: string }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  function handleSend() {
    if (!subject.trim() || !body.trim()) return
    // Placeholder — real send logic goes here
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    setSubject('')
    setBody('')
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <MessageSquarePlus className="w-3 h-3" />
        Nuevo mensaje · <span className="text-primary normal-case font-normal">{email}</span>
      </p>
      <Input
        placeholder="Asunto del mensaje…"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="h-7 text-xs"
      />
      <Textarea
        placeholder="Escribe tu mensaje aquí…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="text-xs min-h-[72px] resize-none"
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {body.length > 0 ? `${body.length} caracteres` : 'Campo vacío'}
        </p>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          disabled={!subject.trim() || !body.trim()}
          onClick={handleSend}
        >
          {sent ? (
            '✓ Enviado'
          ) : (
            <>
              <Send className="w-3 h-3" />
              Enviar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function ContactCard({ contact }: { contact: MockContact }) {
  const [open, setOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Header row */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-0 cursor-pointer transition-colors ${open ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="px-3 py-2.5 min-w-0">
          <p className="text-xs font-medium truncate">{contact.company}</p>
          <a
            href={`https://${contact.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors mt-0.5"
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            {contact.website}
          </a>
        </div>
        <div className="px-3 py-2.5 flex items-center">
          <CategoryBadge category={contact.category} />
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
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Rol
                </span>
                <span className="font-medium">{contact.role}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Región
                </span>
                <span className="font-medium">{contact.region}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Especialización
                </span>
                <span className="font-medium">{contact.specialization}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Email
                </span>
                <a
                  href={`mailto:${contact.email}`}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  {contact.email}
                </a>
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
                onClick={() => window.open(`https://${contact.website}`, '_blank')}
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
            </div>

            {msgOpen && <MessageComposer email={contact.email} />}
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
  const { contacts: allStoreContacts, addContacts } = useContactsStore()
  const { currentId, getCurrent } = useInvestigationStore()

  // Block duplicate campaigns for the same investigation
  const existingCampaign = campaigns.find((c) => c.investigationId === currentId && currentId)
  const alreadyHasCampaign = !!existingCampaign

  // Get contacts belonging to the current investigation from the store
  const investigationContacts = currentId
    ? allStoreContacts.filter((c) => c.investigationId === currentId)
    : []

  // Build the display list: real contacts from the store, or mock data as fallback
  const hasRealContacts = investigationContacts.length > 0

  const displayContacts: MockContact[] = hasRealContacts
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
      }))
    : MOCK_CONTACTS

  // ── Cascade scraping simulation — re-runs every time currentId changes
  // Contacts are shown immediately; the cascade effect happens live
  // during scraping via SCRAPING_CONTACT messages adding to the store one by one.

  // ── Modal state
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
  }

  function handleCreateCampaign() {
    if (!campName.trim()) return
    const inv = getCurrent()

    // Persist contacts to the store only if they're mock (real ones are already persisted)
    if (!hasRealContacts) {
      const contactsToSave: Contact[] = displayContacts.map((c) => ({
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
      contactIds: displayContacts.map((c) => c.id),
      messages: [],
    })

    setCampSaved(true)
    setTimeout(() => {
      setModalOpen(false)
      resetModal()
      onNavigate('campaigns')
    }, 1400)
  }

  return (
    <div className="flex flex-col flex-1">
      {/* ── Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Contactos encontrados
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground font-medium">
            {displayContacts.length}/{displayContacts.length}
          </span>
        </div>
        <Progress value={100} className="h-1" />
      </div>

      {/* ── Contacts list */}
      <div className="space-y-2 flex-1">
        {displayContacts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center gap-2">
            <Scan className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No hay contactos todavía…</p>
          </div>
        )}
        {displayContacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
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
            <Button className="w-full gap-2" onClick={() => setModalOpen(true)}>
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
                    <Plus className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">Nueva Campaña</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {displayContacts.length} contactos seleccionados
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
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3 py-2.5">
                    <User2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {displayContacts.length} contactos
                      </span>{' '}
                      incluidos automáticamente
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
                      className="text-sm min-h-[72px] resize-none bg-background"
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
                    disabled={!campName.trim()}
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
    </div>
  )
}
