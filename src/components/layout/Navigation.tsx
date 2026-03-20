import React from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Users, Send, Clock, BookOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId =
  | 'dashboard'
  | 'investigation'
  | 'contacts'
  | 'campaigns'
  | 'history'
  | 'reports'
  | 'settings'

const TAB_ICONS: Partial<Record<TabId, React.ElementType>> = {
  dashboard: LayoutDashboard,
  contacts: Users,
  campaigns: Send,
  history: Clock,
  reports: BookOpen,
  settings: Settings,
}

const TAB_ORDER: TabId[] = ['dashboard', 'contacts', 'campaigns', 'history', 'reports', 'settings']

interface NavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { t } = useTranslation()

  return (
    <nav className="flex items-center gap-1 px-2 py-2 border-b border-border bg-background">
      {TAB_ORDER.map((tabId) => {
        const Icon = TAB_ICONS[tabId]!
        const isActive =
          activeTab === tabId || (tabId === 'dashboard' && activeTab === 'investigation')
        return (
          <button
            key={tabId}
            type="button"
            onClick={() => onTabChange(tabId)}
            title={t(`nav.${tabId}`)}
            className={cn(
              'flex-1 flex items-center justify-center h-9 rounded-lg transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Icon className="w-4.25 h-4.25" />
          </button>
        )
      })}
    </nav>
  )
}
