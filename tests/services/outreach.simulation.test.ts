import { describe, it, expect, beforeEach } from 'vitest'
import { SimulationOutreachService } from '@services/outreach/outreach.simulation'
import type { Contact } from '@core/types/contact.types'

const MOCK_CONTACT: Contact = {
  id: 'test-1',
  name: 'Test Org',
  role: 'Editor',
  organization: 'Test Org',
  email: 'test@example.com',
  website: 'example.com',
  contactPage: 'example.com/contact',
  specialization: 'Testing',
  topics: ['QA'],
  region: 'Global',
  recentArticles: [],
  category: 'researcher',
  relevanceScore: 80,
  investigationId: 'inv-1',
}

describe('SimulationOutreachService', () => {
  let service: SimulationOutreachService

  beforeEach(() => {
    service = new SimulationOutreachService()
  })

  it('sendEmail returns simulated success', async () => {
    const result = await service.sendEmail(MOCK_CONTACT, 'Test Subject', 'Body')
    expect(result.success).toBe(true)
    expect(result.simulated).toBe(true)
  })

  it('submitForm returns simulated success', async () => {
    const result = await service.submitForm('https://example.com', { message: 'hi' })
    expect(result.success).toBe(true)
    expect(result.simulated).toBe(true)
  })

  it('sendLinkedInMessage returns simulated success', async () => {
    const result = await service.sendLinkedInMessage(MOCK_CONTACT, 'Hello')
    expect(result.success).toBe(true)
    expect(result.simulated).toBe(true)
  })
})
