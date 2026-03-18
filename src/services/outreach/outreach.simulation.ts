import type { Contact } from '@core/types/contact.types'
import type { OutreachService, OutreachResult } from './outreach.interface'
import { Logger } from '@services/logger.service'

const log = Logger.create('Outreach:Simulation')

/**
 * SimulationOutreachService — No-op implementation for development.
 *
 * All actions are logged but never executed. This lets developers
 * validate campaign flows without triggering real outreach.
 */
export class SimulationOutreachService implements OutreachService {
  async sendEmail(contact: Contact, subject: string, _body: string): Promise<OutreachResult> {
    log.info(`Email would be sent to ${contact.email}`, { subject })
    return { success: true, simulated: true }
  }

  async submitForm(url: string, formData: Record<string, string>): Promise<OutreachResult> {
    log.info(`Form would be submitted at ${url}`, { fields: Object.keys(formData).length })
    return { success: true, simulated: true }
  }

  async sendLinkedInMessage(contact: Contact, _message: string): Promise<OutreachResult> {
    log.info(`LinkedIn message would be sent to ${contact.name}`)
    return { success: true, simulated: true }
  }
}
