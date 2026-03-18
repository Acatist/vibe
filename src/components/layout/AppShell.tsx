import React, { useState } from 'react'
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

  const ActiveView = VIEW_MAP[activeTab]

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <main className="p-4 min-h-full flex flex-col animate-fade-in" key={activeTab}>
          <ErrorBoundary key={activeTab}>
            <ActiveView onNavigate={setActiveTab} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
