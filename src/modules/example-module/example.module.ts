import type { ProfileName } from '@core/types/extension.types'
import { StealthEngine } from '@engine/stealth/StealthEngine'
import { energyService } from '@services/energy.service'
import { sessionService } from '@services/session.service'
import { Logger } from '@services/logger.service'
import { clickHuman, typeHuman, scrollHuman, waitRandom } from '@automation/actions'
import { findElement, waitForElement, isVisible } from '@automation/dom'

const log = Logger.create('ExampleModule')

/**
 * ExampleModule — Template module demonstrating how to build automation modules
 * on top of the SEF framework.
 *
 * How to create a new module:
 *   1. Copy this directory to /src/modules/your-module-name/
 *   2. Rename the class and logger context
 *   3. Implement `run()` with your automation logic
 *   4. Import and call from your content script
 *
 * This module demonstrates:
 *   - Energy consumption before actions
 *   - Profile-based StealthEngine usage
 *   - Realistic click, type, and scroll actions
 *   - Error handling pattern
 */
export class ExampleModule {
  private engine: StealthEngine
  private isRunning = false

  constructor(profile: ProfileName = 'normal-user') {
    this.engine = StealthEngine.create(profile)
    sessionService.startSession()
    log.info(`ExampleModule initialized with profile: ${profile}`)
  }

  /**
   * Main entry point for the module's automation sequence.
   * Override this method in your module.
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      log.warn('Module already running')
      return
    }

    this.isRunning = true
    log.info('ExampleModule run started')

    try {
      // 1. Check energy before starting
      if (!energyService.canAfford('scrape')) {
        log.warn('Insufficient energy to run module')
        return
      }

      // 2. Consume energy for the operation
      energyService.consume('scrape')

      // 3. Wait for a target element
      const searchInput = await waitForElement<HTMLInputElement>(
        'input[type="search"], input[name="q"]',
        {
          timeout: 5000,
        },
      )

      // 4. Human-realistic interaction
      await clickHuman(searchInput, {}, this.engine)
      await waitRandom({ min: 300, max: 800 })
      await typeHuman(searchInput, 'stealth automation example', {}, this.engine)

      // 5. Scroll down naturally
      await scrollHuman({
        direction: 'down',
        distance: 400,
        stepDelay: [15, 45],
      })

      // 6. Optional: scrape page data
      const results = this.scrapeResults()
      log.info(`Scraped ${results.length} results`)
    } catch (err) {
      log.error('ExampleModule run failed', err)
    } finally {
      this.isRunning = false
      sessionService.endSession()
    }
  }

  stop(): void {
    this.isRunning = false
    log.info('ExampleModule stopped')
  }

  /**
   * Example DOM scraping method.
   * Replace with site-specific selectors in your module.
   */
  private scrapeResults(): string[] {
    const items = findElement('ul, ol, [role="list"]')
    if (!items) return []

    return Array.from(items.querySelectorAll('li, [role="listitem"]'))
      .filter((el) => isVisible(el))
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)
  }
}

// Export singleton factory
export function createExampleModule(profile: ProfileName = 'normal-user'): ExampleModule {
  return new ExampleModule(profile)
}
