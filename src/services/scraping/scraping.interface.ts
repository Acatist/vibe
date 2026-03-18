// ─────────────────────────────────────────────
// Scraping Service — Strategy Interface
// ─────────────────────────────────────────────

export interface ScrapedContact {
  name: string
  email: string
  role: string
  organization: string
  website: string
  contactPage: string
  specialization: string
  topics: string[]
  region: string
}

export interface DetectedForm {
  url: string
  action: string
  method: string
  fields: FormField[]
}

export interface FormField {
  name: string
  type: string
  label: string
  required: boolean
}

export interface PageMetadata {
  title: string
  description: string
  language: string
  domain: string
  keywords: string[]
}

/**
 * ScrapingService defines the contract for contact discovery.
 *
 * Each runtime environment provides its own implementation:
 *   - SimulationScrapingService  → returns mock data
 *   - StagingScrapingService     → real scraping + debug logging
 *   - ProductionScrapingService  → full real scraping
 */
export interface ScrapingService {
  /** Discover contacts on a page or domain */
  discoverContacts(url: string): Promise<ScrapedContact[]>

  /** Detect contact / submission forms on a page */
  detectForms(url: string): Promise<DetectedForm[]>

  /** Extract page metadata (title, description, keywords) */
  extractMetadata(url: string): Promise<PageMetadata>
}
