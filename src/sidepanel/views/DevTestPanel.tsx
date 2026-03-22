/**
 * DevTestPanel — Provisional dev/test floating panel.
 *
 * Always visible in the bottom-left corner of the sidepanel.
 * Scrapes a single domain (cuidadosalicante.com) and injects the result
 * directly into the contacts store so it appears in ContactsView.
 *
 * PROVISIONAL — remove when no longer needed.
 */
import { useState, useEffect, useCallback } from 'react'
import { Bug, Loader2, CheckCircle, XCircle, ArrowRight, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { messageService } from '@services/message.service'
import { MessageType } from '@core/types/message.types'
import { useContactsStore } from '@store/contacts.store'
import { useInvestigationStore } from '@store/investigation.store'
import type { TabId } from '@components/layout/Navigation'

const TEST_DOMAIN = 'cuidadosalicante.com'
const DEV_TEST_INV_ID = 'dev-test'

type TestStatus = 'idle' | 'probing' | 'done' | 'error'

interface ProbeResult {
  hasForm: boolean
  emails: string[]
  contactMethod: string
  contactPageUrl: string | null
  hasCaptcha: boolean
  domainMeta: { title: string; description: string }
  formFields: Array<{ name: string; type: string; label?: string; required?: boolean }>
  navigationsUsed: number
}

interface TestState {
  status: TestStatus
  result?: ProbeResult
  error?: string
}

interface DevTestPanelProps {
  onNavigate: (tab: TabId) => void
}

export function DevTestPanel({ onNavigate }: DevTestPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const { addContacts } = useContactsStore()

  // Listen for DEV_TEST_RESULT from the background SW
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return

    const handler = (msg: { type: string; payload: unknown }) => {
      if (msg.type !== MessageType.DEV_TEST_RESULT) return
      const p = msg.payload as { domain: string; result?: ProbeResult; error?: string }
      if (p.error) {
        setTest({ status: 'error', error: p.error })
      } else if (p.result) {
        const r = p.result
        // Inject the scraped domain into the contacts store so it appears in ContactsView
        const contact = {
          id: `dev-test-${TEST_DOMAIN}`,
          name: r.domainMeta.title || TEST_DOMAIN,
          role: '',
          organization: r.domainMeta.title || TEST_DOMAIN,
          email: r.emails[0] ?? '',
          website: `https://${TEST_DOMAIN}`,
          contactPage: r.contactPageUrl ?? '',
          specialization: r.domainMeta.description ?? '',
          topics: [],
          region: 'España',
          recentArticles: [],
          category: 'researcher' as const,
          relevanceScore: 85,
          investigationId: DEV_TEST_INV_ID,
          discarded: false,
          contactFormUrl: r.hasForm ? (r.contactPageUrl ?? null) : null,
          formFields: r.formFields,
          contactMethod: (r.contactMethod as 'form' | 'email' | 'both' | 'none'),
          domainMeta: r.domainMeta,
          hasCaptcha: r.hasCaptcha,
        }
        addContacts([contact])
        // Point ContactsView at the dev-test investigation so the contact is visible
        useInvestigationStore.setState({ currentId: DEV_TEST_INV_ID })
        setTest({ status: 'done', result: r })
        setExpanded(true)
      }
    }

    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [addContacts])

  const runProbe = useCallback(() => {
    setTest({ status: 'probing' })
    setExpanded(true)
    messageService
      .send(MessageType.DEV_TEST_PROBE, { domain: TEST_DOMAIN })
      .catch(() => setTest({ status: 'error', error: 'No se pudo contactar con el background' }))
  }, [])

  const goToContacts = useCallback(() => {
    onNavigate('contacts')
    setExpanded(false)
  }, [onNavigate])

  const methodColor =
    test.result?.contactMethod === 'form' || test.result?.contactMethod === 'both'
      ? 'text-emerald-400'
      : test.result?.contactMethod === 'email'
        ? 'text-blue-400'
        : 'text-muted-foreground'

  return (
    <div className="fixed bottom-3 left-3 z-[2147483640] max-w-[260px]">
      <div className="rounded-xl border border-yellow-500/40 bg-background/95 backdrop-blur-sm shadow-xl overflow-hidden">

        {/* Header toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-yellow-500/10 transition-colors"
        >
          <Bug className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          <span className="text-[11px] font-medium text-yellow-500 flex-1 leading-none">
            DEV TEST
          </span>
          {test.status === 'probing' && (
            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
          )}
          {test.status === 'done' && (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          )}
          {test.status === 'error' && (
            <XCircle className="w-3 h-3 text-destructive" />
          )}
          {expanded
            ? <ChevronDown className="w-3 h-3 text-yellow-500/60" />
            : <ChevronUp className="w-3 h-3 text-yellow-500/60" />
          }
        </button>

        {/* Expandable body */}
        {expanded && (
          <div className="border-t border-yellow-500/20 px-3 py-3 space-y-3">

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Dominio</span>
              <span className="text-[10px] font-mono text-foreground">{TEST_DOMAIN}</span>
            </div>

            {/* Status: idle */}
            {test.status === 'idle' && (
              <Button size="sm" onClick={runProbe} className="w-full h-7 text-xs">
                Scrapear dominio
              </Button>
            )}

            {/* Status: probing */}
            {test.status === 'probing' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Probando formularios…</span>
              </div>
            )}

            {/* Status: error */}
            {test.status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-start gap-1.5 text-xs text-destructive">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="leading-tight">{test.error}</span>
                </div>
                <Button size="sm" variant="outline" onClick={runProbe} className="w-full h-7 text-xs gap-1">
                  <RotateCcw className="w-3 h-3" /> Reintentar
                </Button>
              </div>
            )}

            {/* Status: done */}
            {test.status === 'done' && test.result && (
              <div className="space-y-2.5">

                {/* Site title */}
                {test.result.domainMeta.title && (
                  <p className="text-[10px] text-foreground font-medium truncate leading-tight">
                    {test.result.domainMeta.title}
                  </p>
                )}

                {/* Contact method */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${methodColor}`}>
                    {test.result.hasForm ? '✓ Formulario encontrado' : '✗ Sin formulario'}
                  </span>
                  {test.result.hasCaptcha && (
                    <span className="text-[9px] text-amber-500 border border-amber-500/30 rounded px-1">
                      CAPTCHA
                    </span>
                  )}
                </div>

                {/* Contact page URL */}
                {test.result.contactPageUrl && (
                  <p className="text-[9px] font-mono text-blue-400 truncate">
                    {test.result.contactPageUrl.replace(/^https?:\/\//, '')}
                  </p>
                )}

                {/* Form fields */}
                {test.result.formFields.length > 0 && (
                  <div className="text-[9px] text-muted-foreground">
                    {test.result.formFields.length} campos:{' '}
                    {test.result.formFields.map((f) => f.label || f.name || f.type).join(', ')}
                  </div>
                )}

                {/* Emails */}
                {test.result.emails.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Emails encontrados</span>
                    {test.result.emails.map((e) => (
                      <p key={e} className="text-[10px] font-mono text-foreground truncate">{e}</p>
                    ))}
                  </div>
                )}

                {/* Navigations used */}
                <p className="text-[9px] text-muted-foreground">
                  Navegaciones usadas: {test.result.navigationsUsed}
                </p>

                {/* Actions */}
                <div className="flex gap-1.5 pt-0.5">
                  <Button
                    size="sm"
                    onClick={goToContacts}
                    className="flex-1 h-7 text-xs gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Ver en Contactos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runProbe}
                    className="h-7 w-7 p-0 shrink-0"
                    title="Volver a scrapear"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
