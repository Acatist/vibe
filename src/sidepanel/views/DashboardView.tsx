import { InvestigationView } from './InvestigationView'
import type { TabId } from '@components/layout/Navigation'

interface DashboardViewProps {
  onNavigate: (tab: TabId) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  return <InvestigationView onNavigate={onNavigate} />
}
