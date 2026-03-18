import type {
  ScrapingService,
  ScrapedContact,
  DetectedForm,
  PageMetadata,
} from './scraping.interface'
import { Logger } from '@services/logger.service'

const log = Logger.create('Scraping:Simulation')

/**
 * Mock contacts returned during simulation mode.
 * Mirrors the demo data used in the UI for consistency.
 */
const MOCK_CONTACTS: ScrapedContact[] = [
  {
    name: 'TechInsight Media',
    email: 'editorial@techinsight.com',
    role: 'Editor Jefe',
    organization: 'TechInsight Media',
    website: 'www.techinsight.com',
    contactPage: 'www.techinsight.com/contacto',
    specialization: 'Tecnología e Inteligencia Artificial',
    topics: ['IA', 'Privacidad', 'Big Data'],
    region: 'España',
  },
  {
    name: 'EcoFund Global',
    email: 'info@ecofundglobal.org',
    role: 'Director de Comunicación',
    organization: 'EcoFund Global',
    website: 'www.ecofundglobal.org',
    contactPage: 'www.ecofundglobal.org/contact',
    specialization: 'Sostenibilidad y Medioambiente',
    topics: ['Medio Ambiente', 'Financiación Verde', 'ESG'],
    region: 'Europa',
  },
  {
    name: 'Transparency Watch EU',
    email: 'press@transparencywatch.eu',
    role: 'Investigadora Senior',
    organization: 'Transparency Watch EU',
    website: 'www.transparencywatch.eu',
    contactPage: 'www.transparencywatch.eu/press',
    specialization: 'Corrupción y Transparencia Institucional',
    topics: ['Corrupción', 'Lobbying', 'Datos Abiertos'],
    region: 'UE',
  },
  {
    name: 'Open Justice Foundation',
    email: 'legal@openjustice.org',
    role: 'Abogado Principal',
    organization: 'Open Justice Foundation',
    website: 'www.openjustice.org',
    contactPage: 'www.openjustice.org/contact',
    specialization: 'Derechos Digitales y Libertad de Expresión',
    topics: ['Derechos Digitales', 'RGPD', 'Ciberseguridad'],
    region: 'Internacional',
  },
  {
    name: 'DataDriven Research Institute',
    email: 'hello@datadrivenresearch.io',
    role: 'Responsable de Alianzas',
    organization: 'DataDriven Research Institute',
    website: 'www.datadrivenresearch.io',
    contactPage: 'www.datadrivenresearch.io/contact',
    specialization: 'Análisis de Datos y Políticas Públicas',
    topics: ['Datos', 'Gobierno Abierto', 'Innovación'],
    region: 'Global',
  },
]

const MOCK_FORMS: DetectedForm[] = [
  {
    url: 'https://example.com/contact',
    action: '/api/contact',
    method: 'POST',
    fields: [
      { name: 'name', type: 'text', label: 'Nombre', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'message', type: 'textarea', label: 'Mensaje', required: true },
    ],
  },
]

/**
 * SimulationScrapingService — Returns mock data for development.
 */
export class SimulationScrapingService implements ScrapingService {
  async discoverContacts(url: string): Promise<ScrapedContact[]> {
    log.info(`Scraping contacts (simulated) from ${url}`)
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 800))
    return MOCK_CONTACTS
  }

  async detectForms(url: string): Promise<DetectedForm[]> {
    log.info(`Detecting forms (simulated) at ${url}`)
    await new Promise((r) => setTimeout(r, 400))
    return MOCK_FORMS
  }

  async extractMetadata(url: string): Promise<PageMetadata> {
    log.info(`Extracting metadata (simulated) from ${url}`)
    await new Promise((r) => setTimeout(r, 300))
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    return {
      title: `${domain} — Simulated Page`,
      description: 'Simulated page metadata for development',
      language: 'es',
      domain,
      keywords: ['simulation', 'demo'],
    }
  }
}
