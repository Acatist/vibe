import type {
  ScrapingService,
  ScrapedContact,
  DetectedForm,
  PageMetadata,
} from './scraping.interface'
import { ProductionScrapingService } from './scraping.production'
import { Logger } from '@services/logger.service'

const log = Logger.create('Scraping:Staging')

/**
 * StagingScrapingService — Real scraping with extra debug logging.
 *
 * Delegates to the production implementation but adds timing info
 * and verbose logging for test verification.
 */
export class StagingScrapingService implements ScrapingService {
  private prod = new ProductionScrapingService()

  async discoverContacts(url: string): Promise<ScrapedContact[]> {
    const start = performance.now()
    log.debug(`[staging] discoverContacts: ${url}`)
    const result = await this.prod.discoverContacts(url)
    log.debug(
      `[staging] discoverContacts done in ${Math.round(performance.now() - start)}ms — ${result.length} contacts`,
    )
    return result
  }

  async detectForms(url: string): Promise<DetectedForm[]> {
    const start = performance.now()
    log.debug(`[staging] detectForms: ${url}`)
    const result = await this.prod.detectForms(url)
    log.debug(
      `[staging] detectForms done in ${Math.round(performance.now() - start)}ms — ${result.length} forms`,
    )
    return result
  }

  async extractMetadata(url: string): Promise<PageMetadata> {
    const start = performance.now()
    log.debug(`[staging] extractMetadata: ${url}`)
    const result = await this.prod.extractMetadata(url)
    log.debug(`[staging] extractMetadata done in ${Math.round(performance.now() - start)}ms`)
    return result
  }
}
