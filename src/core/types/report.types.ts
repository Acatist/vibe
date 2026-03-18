export interface CategoryStat {
  cat: string
  count: number
}

export type ReportChannel = 'Email' | 'LinkedIn' | 'Web'

export interface Report {
  id: string
  campaignId: string
  campaignName: string
  clientName: string
  channel: ReportChannel
  campaignType: string
  subject: string
  period: string
  contactCount: number
  sentCount: number
  failedCount: number
  responseCount: number
  responseRate: number
  avgScore: number
  highScore: number
  lowScore: number
  createdAt: string
  categories: CategoryStat[]
  downloadFolder: string
  fileNamePrefix: string
  includeDate: boolean
  investigationMarkdown?: string
  /** Present only for simulation reports */
  simulation?: SimulationReportData
}

export interface SimulationReportData {
  pagesVisited: number
  contactsDiscovered: number
  highAffinityCount: number
  emailsWouldSend: number
  formsWouldSubmit: number
  estimatedEnergyCost: number
  estimatedDurationMs: number
}
