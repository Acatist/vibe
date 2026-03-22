import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { Navigation, type TabId } from './Navigation'
import { ErrorBoundary } from '@components/ui/ErrorBoundary'
import { DashboardView } from '@/sidepanel/views/DashboardView'
import { InvestigationView } from '@/sidepanel/views/InvestigationView'
import { ContactsView } from '@/sidepanel/views/ContactsView'
import { CampaignsView } from '@/sidepanel/views/CampaignsView'
import { HistoryView } from '@/sidepanel/views/HistoryView'
import { ReportsView } from '@/sidepanel/views/ReportsView'
import { SettingsView } from '@/sidepanel/views/SettingsView'
import { DevTestPanel } from '@/sidepanel/views/DevTestPanel'
import { MessageType } from '@core/types/message.types'
import { messageService } from '@services/message.service'
import { useInvestigationStore } from '@store/investigation.store'
import { useContactsStore } from '@store/contacts.store'
import { useEnergyStore } from '@store/energy.store'
import type { Contact, ContactCategory } from '@core/types/contact.types'
import type { EnergyState } from '@core/types/energy.types'

// ─── Helpers (shared with contact-building from scraping messages) ───────────

function formatEmailToName(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function inferCategoryFromBrief(affinityCategory: string, contactType: string): ContactCategory {
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

const VIEW_MAP: Record<TabId, React.ComponentType<{ onNavigate: (tab: TabId) => void }>> = {
  dashboard: DashboardView,
  investigation: InvestigationView,
  contacts: ContactsView,
  campaigns: CampaignsView,
  history: HistoryView,
  reports: ReportsView,
  settings: SettingsView,
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  const {
    setLiveScrapingProgress,
    setLiveScrapingDone,
    setScrapeStatus,
    completeInvestigation,
    addContactIds,
    setLastFinishReason,
    activeBrief: _activeBrief, // subscribed so component re-renders when brief is set
  } = useInvestigationStore()
  const { addContacts } = useContactsStore()

  // ── Global scraping message listener ─────────────────────────────────────
  // Lives here so it persists regardless of which view is currently active.
  // InvestigationView was previously the listener, but unmounts on navigation.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return

    // Initial energy sync from background SW so the ring shows the real level immediately.
    messageService
      .send(MessageType.ENERGY_GET, undefined)
      .then((result) => {
        if (result?.success && result.data) {
          const d = result.data as EnergyState
          useEnergyStore.setState({ current: d.current, max: d.max, isInfinite: d.isInfinite })
        }
      })
      .catch(() => {})

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMessage = (msg: any) => {
      const { type, payload: p } = msg

      if (type === MessageType.SCRAPING_PROGRESS) {
        // Only update live state for truly active statuses.
        // 'complete' / 'cancelled' are handled by SCRAPING_COMPLETE / cleanup below.
        if (p.status === 'running' || p.status === 'paused') {
          setLiveScrapingProgress({
            status: p.status === 'paused' ? 'paused' : 'running',
            contactsFound: p.contactsFound,
            currentUrl: p.currentUrl ?? '',
            total: p.targetCount,
            pagesScanned: p.pagesScanned ?? 0,
            domainsChecked: p.domainsChecked ?? 0,
            formsFound: p.formsFound ?? 0,
            currentDomain: p.currentDomain ?? '',
          })
        } else {
          // Treat any terminal status as done so the progress card is hidden.
          setLiveScrapingDone()
        }
        if (typeof p.energyLeft === 'number') {
          useEnergyStore.setState({ current: p.energyLeft })
        }
      } else if (type === MessageType.SCRAPING_CONTACT) {
        const c = p.contact
        const brief = useInvestigationStore.getState().activeBrief
        const contact: Contact = {
          id: crypto.randomUUID(),
          name: c.name || formatEmailToName(c.email || 'unknown'),
          role: c.role || '',
          organization: c.organization || '',
          email: c.email || '',
          website: c.website || '',
          contactPage: c.contactPage || '',
          specialization: c.specialization || '',
          topics: c.topics?.length
            ? c.topics
            : [brief?.affinityCategory ?? '', brief?.affinitySubcategory ?? ''].filter(Boolean),
          region: c.region || 'International',
          recentArticles: [],
          category: (c.classification === 'high'
            ? 'researcher'
            : inferCategoryFromBrief(
                brief?.affinityCategory ?? '',
                brief?.contactType ?? 'corporate',
              )) as ContactCategory,
          relevanceScore: typeof c.discoveryScore === 'number' ? c.discoveryScore : 50,
          investigationId: p.invId,
          discarded: !!c.discarded,
          // Form-centric fields
          contactFormUrl: c.contactFormUrl ?? null,
          formFields: c.formFields ?? [],
          contactMethod: c.contactMethod ?? (c.email ? 'email' : 'none'),
          domainMeta: c.domainMeta,
          hasCaptcha: c.hasCaptcha ?? false,
        }
        addContacts([contact])
        addContactIds(p.invId, [contact.id])
      } else if (type === MessageType.SCRAPING_COMPLETE) {
        setScrapeStatus(p.invId, 'done')
        completeInvestigation(p.invId)
        setLiveScrapingDone()
        if (p.finishReason && p.finishReason !== 'target-reached') {
          setLastFinishReason(p.finishReason)
        } else {
          setLastFinishReason(null)
        }
      } else if (type === MessageType.SCRAPING_ERROR) {
        setScrapeStatus(p.invId, 'error')
        setLiveScrapingDone()
      }
    }

    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage?.removeListener(onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ActiveView = VIEW_MAP[activeTab]

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto">
        <main className="p-4 min-h-full flex flex-col">
          <div key={activeTab} className="animate-fade-in flex flex-col flex-1">
            <ErrorBoundary>
              <ActiveView onNavigate={setActiveTab} />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      {/* DEV TEST — provisional floating panel, remove when no longer needed */}
      <DevTestPanel onNavigate={setActiveTab} />
    </div>
  )
}
