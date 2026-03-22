import type {
  CampaignProgress,
  CampaignExecutionResult,
  ContactOutreachResult,
  EnergyUsage,
} from '@core/types/campaign-engine.types'
import type { Contact } from '@core/types/contact.types'
import type { Campaign } from '@core/types/campaign.types'
import { createScrapingService } from '@services/scraping'
import { createOutreachService } from '@services/outreach'
import { scoreAffinity } from '@engine/affinity'
import { getAIProvider } from '@services/ai.service'
import { energyService } from '@services/energy.service'
import { isSimulation } from '@services/runtime.service'
import { Logger } from '@services/logger.service'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { useReportsStore } from '@store/reports.store'
import { useDomainMemoryStore } from '@store/domain.memory.store'
import { getBestChannel } from '@utils/channel.router'

const log = Logger.create('CampaignEngine')

export type ProgressCallback = (progress: CampaignProgress) => void

const STEPS = ['discover', 'evaluate', 'generate', 'outreach', 'report'] as const

function emitProgress(cb: ProgressCallback | undefined, stepIdx: number, label: string) {
  cb?.({ step: STEPS[stepIdx], totalSteps: STEPS.length, currentStep: stepIdx, label })
}

/**
 * CampaignEngine — Orchestrates the full outreach pipeline.
 *
 * Pipeline:
 *   1. discover  — Scrape contacts from target URLs
 *   2. evaluate  — Score affinity for each contact
 *   3. generate  — Generate personalised outreach via AI
 *   4. outreach  — Send messages (real or simulated based on runtime)
 *   5. report    — Compile execution results
 *
 * The engine never checks the runtime mode directly — it relies on
 * the outreach and scraping factories to return the correct strategy.
 */
export async function executeCampaign(
  campaign: Campaign,
  targetUrls: string[],
  campaignDescription: string,
  targetCategory: string,
  targetSubcategory: string,
  onProgress?: ProgressCallback,
): Promise<CampaignExecutionResult> {
  const startTime = performance.now()
  const simulated = isSimulation()
  const energyBefore = energyService.getState().totalConsumed

  const scraper = createScrapingService()
  const outreach = createOutreachService()

  log.info(`Starting campaign "${campaign.name}" (${simulated ? 'simulation' : 'live'})`)

  // Mark campaign as running
  useCampaignStore.getState().startCampaign(campaign.id)

  // ── Step 1: Resolve contacts ──────────────────────────────────────────
  // Primary path: use contacts already discovered by the investigation scraper.
  // These contacts carry full form metadata (contactFormUrl, formFields, contactMethod).
  // Fall back to legacy scraping only if no store contacts are linked.
  emitProgress(onProgress, 0, 'Resolving contacts…')
  const storeContacts = campaign.contactIds
    .map((id) => useContactsStore.getState().contacts.find((c) => c.id === id))
    .filter((c): c is Contact => !!c)

  let contacts: Contact[]
  if (storeContacts.length > 0) {
    // Only include contactable entries (form or email channel available)
    contacts = storeContacts.filter(
      (c) => c.contactMethod === 'form' || c.contactMethod === 'both' || c.email,
    )
    log.info(`Using ${contacts.length} contacts from investigation store (${storeContacts.length} total linked)`)
  } else {
    // Legacy fallback: run scraper on provided target URLs
    const allScraped = []
    for (const url of targetUrls) {
      const scraped = await scraper.discoverContacts(url)
      allScraped.push(...scraped)
    }
    log.info(`Legacy scrape: discovered ${allScraped.length} contacts from ${targetUrls.length} URLs`)
    contacts = allScraped.map((sc) => ({
      id: crypto.randomUUID(),
      name: sc.name || sc.organization,
      role: sc.role,
      organization: sc.organization,
      email: sc.email,
      website: sc.website,
      contactPage: sc.contactPage,
      specialization: sc.specialization,
      topics: sc.topics,
      region: sc.region,
      recentArticles: [],
      category: 'researcher' as const,
      relevanceScore: 0,
      investigationId: campaign.investigationId,
    }))
    useContactsStore.getState().addContacts(contacts)
  }

  // ── Step 2: Evaluate affinity ──────────────────────────────────────────
  emitProgress(onProgress, 1, 'Evaluating affinity…')
  const affinityResults = []
  for (const contact of contacts) {
    const result = await scoreAffinity({
      contactName: contact.name,
      contactSpecialization: contact.specialization,
      contactTopics: contact.topics,
      campaignDescription,
      targetCategory,
      targetSubcategory,
    })
    // Update relevanceScore in store
    useContactsStore.getState().updateContact(contact.id, {
      relevanceScore: result.score,
    })
    affinityResults.push({ contact, result })
  }
  const highAffinityCount = affinityResults.filter((a) => a.result.classification === 'high').length
  log.info(`Affinity scored: ${highAffinityCount} high, ${affinityResults.length} total`)

  // ── Step 3: Generate outreach messages ─────────────────────────────────
  emitProgress(onProgress, 2, 'Generating messages…')
  const provider = getAIProvider()
  const outreachMessages = []
  for (const { contact } of affinityResults) {
    try {
      const result = await provider.generateMessages(contact, campaignDescription)
      if (result.success && result.data) {
        outreachMessages.push({ contact, message: result.data })
      } else {
        outreachMessages.push({ contact, message: null })
      }
    } catch (e) {
      log.warn(`AI message generation failed for ${contact.name}`, (e as Error).message)
      outreachMessages.push({ contact, message: null })
    }
  }

  // Persist messages to store — channel chosen per contact method
  const storeMessages = outreachMessages.map(({ contact, message }) => ({
    contactId: contact.id,
    emailSubject: message?.emailSubject ?? '',
    emailBody: message?.emailBody ?? '',
    contactFormMessage: message?.contactFormMessage ?? '',
    followUpMessage: message?.followUpMessage ?? '',
    channel: (contact.contactMethod === 'form' || contact.contactMethod === 'both'
      ? 'contactForm'
      : 'email') as 'email' | 'contactForm',
    status: 'pending' as const,
    sentAt: null,
    error: null,
  }))
  useCampaignStore.getState().setMessages(campaign.id, storeMessages)

  // ── Awaiting-review checkpoint ─────────────────────────────────────────
  // When the campaign requires manual approval, pause here and return a
  // partial result. The UI shows a ReviewCheckpointView where the user can
  // approve/edit messages, then call resumeAfterReview() to continue.
  if (campaign.requiresApproval) {
    useCampaignStore.getState().updateCampaignStatus(campaign.id, 'awaiting-review')
    log.info(`Campaign "${campaign.name}" paused for manual review (${outreachMessages.length} messages)`)

    const energyAfter = energyService.getState().totalConsumed
    return {
      campaignId: campaign.id,
      contacts,
      highAffinityCount,
      outreachResults: [],
      energyUsage: {
        pagesVisited: targetUrls.length,
        aiRequests: outreachMessages.length + affinityResults.length,
        automationActions: 0,
        totalConsumed: energyAfter - energyBefore,
      },
      durationMs: performance.now() - startTime,
      simulated,
      awaitingReview: true,
    }
  }

  // ── Step 4: Execute outreach ───────────────────────────────────────────
  emitProgress(onProgress, 3, 'Sending outreach…')
  const outreachResults: ContactOutreachResult[] = []
  const domainMemory = useDomainMemoryStore.getState()

  for (let i = 0; i < outreachMessages.length; i++) {
    const { contact, message } = outreachMessages[i]
    const affinityResult = affinityResults[i].result

    let outreachResult
    if (message) {
      const contactDomain = contact.website || contact.contactFormUrl || ''
      const domainRecord = domainMemory.getDomain(contactDomain)
      const channel = getBestChannel(contact, domainRecord)
      const formUrl = contact.contactFormUrl || contact.contactPage || ''

      if (channel === 'form' && formUrl) {
        const formData: Record<string, string> = message.formFieldMapping
          ? { ...message.formFieldMapping }
          : { message: message.contactFormMessage }
        outreachResult = await outreach.submitForm(formUrl, formData)
        log.info(`Form submitted for ${contact.name} at ${formUrl}`)

        // Track in DomainMemory
        if (outreachResult.success) {
          domainMemory.incrementField(contactDomain, 'formSubmissions')
        }
      } else if (channel === 'email' && contact.email) {
        outreachResult = await outreach.sendEmail(contact, message.emailSubject, message.emailBody)
        log.info(`Email sent to ${contact.name} (${contact.email})`)

        // Track in DomainMemory
        if (outreachResult.success) {
          domainMemory.incrementField(contactDomain, 'emailsOpened')
        }
      } else {
        outreachResult = { success: false, simulated, error: 'No valid contact channel (no form URL and no email)' }
        log.warn(`No contact channel for ${contact.name}`)
      }

      // Track outreach attempt regardless of success
      domainMemory.incrementField(contactDomain, 'outreachAttempted')

      // Update message status
      useCampaignStore
        .getState()
        .updateMessageStatus(
          campaign.id,
          contact.id,
          outreachResult.status ?? (outreachResult.success ? 'sent' : 'failed'),
          outreachResult.error,
        )
    } else {
      outreachResult = { success: false, simulated, error: 'No message generated' }
      useCampaignStore
        .getState()
        .updateMessageStatus(campaign.id, contact.id, 'failed', 'No message generated')
    }

    outreachResults.push({
      contactId: contact.id,
      contactName: contact.name,
      affinity: affinityResult,
      outreach: outreachResult,
    })
  }

  // ── Step 5: Compile report ─────────────────────────────────────────────
  emitProgress(onProgress, 4, 'Generating report…')

  // Mark campaign complete
  useCampaignStore.getState().completeCampaign(campaign.id)

  const energyAfter = energyService.getState().totalConsumed
  const energyUsage: EnergyUsage = {
    pagesVisited: targetUrls.length,
    aiRequests: outreachMessages.length + affinityResults.length,
    automationActions: outreachResults.filter((r) => r.outreach.success).length,
    totalConsumed: energyAfter - energyBefore,
  }

  const durationMs = performance.now() - startTime
  log.info(`Campaign "${campaign.name}" completed in ${Math.round(durationMs)}ms`)

  // Auto-generate a simulation report when in simulation mode
  if (simulated) {
    const successCount = outreachResults.filter((r) => r.outreach.success).length
    useReportsStore.getState().addReport({
      campaignId: campaign.id,
      campaignName: campaign.name,
      clientName: '',
      channel: 'Email',
      campaignType: 'simulation',
      subject: '',
      period: new Date().toLocaleDateString('es-ES'),
      contactCount: contacts.length,
      sentCount: successCount,
      failedCount: outreachResults.length - successCount,
      responseCount: 0,
      responseRate: 0,
      avgScore: affinityResults.length
        ? Math.round(
            affinityResults.reduce((s, a) => s + a.result.score, 0) / affinityResults.length,
          )
        : 0,
      highScore: affinityResults.length
        ? Math.max(...affinityResults.map((a) => a.result.score))
        : 0,
      lowScore: affinityResults.length
        ? Math.min(...affinityResults.map((a) => a.result.score))
        : 0,
      createdAt: new Date().toISOString(),
      categories: [],
      downloadFolder: '',
      fileNamePrefix: '',
      includeDate: true,
      simulation: {
        pagesVisited: targetUrls.length,
        contactsDiscovered: contacts.length,
        highAffinityCount,
        emailsWouldSend: successCount,
        formsWouldSubmit: 0,
        estimatedEnergyCost: energyUsage.totalConsumed,
        estimatedDurationMs: durationMs,
      },
    })
    log.info('Simulation report generated')
  }

  return {
    campaignId: campaign.id,
    contacts,
    highAffinityCount,
    outreachResults,
    energyUsage,
    durationMs,
    simulated,
  }
}

/**
 * Resume a campaign that was paused for manual review.
 *
 * Called after the user approves (and optionally edits) messages.
 * Only the approved contacts proceed to outreach.
 */
export async function resumeAfterReview(
  campaignId: string,
  approvedContactIds: string[],
  onProgress?: ProgressCallback,
): Promise<CampaignExecutionResult> {
  const startTime = performance.now()
  const simulated = isSimulation()
  const energyBefore = energyService.getState().totalConsumed

  const campaign = useCampaignStore.getState().getCampaign(campaignId)
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const outreach = createOutreachService()
  const domainMemory = useDomainMemoryStore.getState()

  log.info(`Resuming campaign "${campaign.name}" after review — ${approvedContactIds.length} contacts approved`)

  // Switch status back to running
  useCampaignStore.getState().updateCampaignStatus(campaignId, 'running')

  // Resolve approved contacts and their pre-generated messages
  const allContacts = useContactsStore.getState().contacts
  const contacts = approvedContactIds
    .map((id) => allContacts.find((c) => c.id === id))
    .filter((c): c is Contact => !!c)

  // ── Step 4: Execute outreach ─────────────────────────────────────────
  emitProgress(onProgress, 3, 'Sending outreach…')
  const outreachResults: ContactOutreachResult[] = []

  for (const contact of contacts) {
    const storedMessage = campaign.messages.find((m) => m.contactId === contact.id)
    if (!storedMessage || storedMessage.status === 'failed') {
      outreachResults.push({
        contactId: contact.id,
        contactName: contact.name,
        affinity: { score: contact.relevanceScore, classification: 'medium', reasoning: '' },
        outreach: { success: false, simulated, error: 'No approved message' },
      })
      continue
    }

    const contactDomain = contact.website || contact.contactFormUrl || ''
    const domainRecord = domainMemory.getDomain(contactDomain)
    const channel = getBestChannel(contact, domainRecord)
    const formUrl = contact.contactFormUrl || contact.contactPage || ''
    let outreachResult

    if (channel === 'form' && formUrl) {
      const formData: Record<string, string> = storedMessage.formSubmissionData
        ? { ...storedMessage.formSubmissionData }
        : { message: storedMessage.contactFormMessage }
      outreachResult = await outreach.submitForm(formUrl, formData)
      if (outreachResult.success) domainMemory.incrementField(contactDomain, 'formSubmissions')
    } else if (channel === 'email' && contact.email) {
      outreachResult = await outreach.sendEmail(contact, storedMessage.emailSubject, storedMessage.emailBody)
      if (outreachResult.success) domainMemory.incrementField(contactDomain, 'emailsOpened')
    } else {
      outreachResult = { success: false, simulated, error: 'No valid contact channel' }
    }

    domainMemory.incrementField(contactDomain, 'outreachAttempted')
    useCampaignStore
      .getState()
      .updateMessageStatus(
        campaignId,
        contact.id,
        outreachResult.status ?? (outreachResult.success ? 'sent' : 'failed'),
        outreachResult.error,
      )

    outreachResults.push({
      contactId: contact.id,
      contactName: contact.name,
      affinity: { score: contact.relevanceScore, classification: 'medium', reasoning: '' },
      outreach: outreachResult,
    })
  }

  // ── Step 5: Complete ─────────────────────────────────────────────────
  emitProgress(onProgress, 4, 'Generating report…')
  useCampaignStore.getState().completeCampaign(campaignId)

  const energyAfter = energyService.getState().totalConsumed
  const durationMs = performance.now() - startTime
  log.info(`Campaign "${campaign.name}" completed after review in ${Math.round(durationMs)}ms`)

  return {
    campaignId,
    contacts,
    highAffinityCount: 0,
    outreachResults,
    energyUsage: {
      pagesVisited: 0,
      aiRequests: 0,
      automationActions: outreachResults.filter((r) => r.outreach.success).length,
      totalConsumed: energyAfter - energyBefore,
    },
    durationMs,
    simulated,
  }
}
