import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, Trash2, Plus, X, Sparkles, Search, Rocket, AlertTriangle } from 'lucide-react'
import { useInvestigationStore } from '@store/investigation.store'
import { useReportsStore } from '@store/reports.store'
import { useCampaignStore } from '@store/campaign.store'
import { useContactsStore } from '@store/contacts.store'
import { useSettingsStore } from '@store/settings.store'
import { useBusinessStore, type BusinessProfile } from '@store/business.store'
import { useDomainMemoryStore } from '@store/domain.memory.store'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Separator } from '@components/ui/separator'
import type { TabId } from '@components/layout/Navigation'
import type { Report, ReportChannel, CategoryStat } from '@core/types/report.types'
import type { Campaign } from '@core/types/campaign.types'
import type { Contact } from '@core/types/contact.types'

// ── Campaign stats helper ──────────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  journalist: 'Journalist',
  'investigative-reporter': 'Investigative Reporter',
  ngo: 'NGO',
  'legal-advocate': 'Legal Advocate',
  researcher: 'Researcher',
  activist: 'Activist',
}

function getCampaignStats(campaign: Campaign, allContacts: Contact[]) {
  const contacts = campaign.contactIds
    .map((id) => allContacts.find((c) => c.id === id))
    .filter(Boolean) as Contact[]
  const sentCount = campaign.messages.filter((m) => m.status === 'sent').length
  const failedCount = campaign.messages.filter((m) => m.status === 'failed').length
  const responseCount = 0 // responses not tracked yet in the system
  const contactCount = campaign.contactIds.length
  const scores = contacts.map((c) => c.relevanceScore).filter((s) => s > 0)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const highScore = scores.length ? Math.max(...scores) : 0
  const lowScore = scores.length ? Math.min(...scores) : 0

  // Build category stats
  const catMap = new Map<string, number>()
  contacts.forEach((c) => {
    const label = CAT_LABELS[c.category] ?? c.category
    catMap.set(label, (catMap.get(label) ?? 0) + 1)
  })
  const categories: CategoryStat[] = Array.from(catMap.entries())
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => b.count - a.count)

  // Determine channel from first message or default
  const firstMsg = campaign.messages[0]
  const channel: ReportChannel =
    firstMsg?.channel === 'professionalMessaging'
      ? 'LinkedIn'
      : firstMsg?.channel === 'contactForm'
        ? 'Web'
        : 'Email'

  // Period from timestamps
  const start = campaign.startedAt ?? campaign.createdAt
  const end = campaign.completedAt ?? Date.now()
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  const period = `${fmt(start)} – ${fmt(end)}`

  // Subject from first message
  const subject = firstMsg?.emailSubject ?? ''

  return {
    contactCount,
    sentCount,
    failedCount,
    responseCount,
    responseRate: sentCount > 0 ? Math.round((responseCount / sentCount) * 100) : 0,
    avgScore,
    highScore,
    lowScore,
    categories,
    channel,
    period,
    subject,
  }
}

// ── Demo campaigns for when store is empty ─────────────────────────────────────
const DEMO_CAMPAIGNS: {
  id: string
  name: string
  channel: ReportChannel
  contactCount: number
  sentCount: number
  failedCount: number
  responseCount: number
  responseRate: number
  avgScore: number
  highScore: number
  lowScore: number
  period: string
  subject: string
  type: string
  categories: CategoryStat[]
}[] = [
  {
    id: 'demo-c1',
    name: 'Startups TechIA USA',
    channel: 'Email',
    contactCount: 45,
    sentCount: 38,
    failedCount: 7,
    responseCount: 5,
    responseRate: 13,
    avgScore: 82,
    highScore: 97,
    lowScore: 55,
    period: '12–14 Mar 2026',
    subject: 'Partnership Opportunity in AI Solutions',
    type: 'Outreach B2B',
    categories: [
      { cat: 'SaaS / Software', count: 18 },
      { cat: 'Startup / Venture', count: 12 },
      { cat: 'AI / ML Company', count: 9 },
      { cat: 'Digital Agency', count: 6 },
    ],
  },
  {
    id: 'demo-c2',
    name: 'Agencias Marketing Digital Europa',
    channel: 'LinkedIn',
    contactCount: 35,
    sentCount: 30,
    failedCount: 5,
    responseCount: 8,
    responseRate: 27,
    avgScore: 76,
    highScore: 92,
    lowScore: 51,
    period: '8–10 Mar 2026',
    subject: 'Colaboración en Automatización de Outreach',
    type: 'Outreach B2B',
    categories: [
      { cat: 'Marketing Agency', count: 22 },
      { cat: 'Digital Strategy', count: 8 },
      { cat: 'Growth Hacking', count: 5 },
    ],
  },
]

// ── Channel theming ────────────────────────────────────────────────────────────
const CH_CFG: Record<ReportChannel, { icon: string; grad: string }> = {
  Email: { icon: '✉️', grad: 'from-blue-600 via-blue-700 to-indigo-700' },
  LinkedIn: { icon: '💼', grad: 'from-indigo-600 via-violet-700 to-purple-700' },
  Web: { icon: '🌐', grad: 'from-emerald-600 via-teal-600 to-cyan-700' },
}

// Fallback solid bg if gradient stops fail
const CH_FALLBACK: Record<ReportChannel, string> = {
  Email: 'bg-blue-700',
  LinkedIn: 'bg-violet-700',
  Web: 'bg-teal-700',
}

// ── PDF generation ────────────────────────────────────────────────────────────
async function downloadPDF(report: Report, biz: BusinessProfile) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210,
    H = 297,
    M = 20,
    CW = W - M * 2

  // Color palette
  type RGB = [number, number, number]
  const C: Record<string, RGB> = {
    dark: [15, 23, 42],
    prim: [37, 99, 235],
    muted: [100, 116, 139],
    border: [226, 232, 240],
    light: [248, 250, 252],
    green: [22, 163, 74],
    red: [220, 38, 38],
    white: [255, 255, 255],
    accent: [239, 246, 255],
    slate4: [148, 163, 184],
    purple: [124, 58, 237],
  }

  let y = 0

  const brandName = biz.companyName || 'VIBE REACH'
  const brandNameUpper = brandName.toUpperCase()

  function addPageHeader() {
    doc.setFillColor(...C.prim)
    doc.rect(0, 0, W, 14, 'F')
    doc.setTextColor(...C.white)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${brandNameUpper}  ·  INFORME DE CAMPAÑA`, M, 9)
    doc.text(`${report.clientName}  /  ${report.campaignName}`, W - M, 9, { align: 'right' })
  }

  function addPageFooter(pg: number, total: number) {
    doc.setFillColor(...C.dark)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setTextColor(...C.slate4)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Página ${pg} de ${total}`, M, H - 4.5)
    doc.text(`Generado por ${brandName}`, W / 2, H - 4.5, { align: 'center' })
    doc.text(report.createdAt, W - M, H - 4.5, { align: 'right' })
  }

  function checkNewPage() {
    if (y > 252) {
      doc.addPage()
      addPageHeader()
      y = 28
    }
  }

  function sectionHeading(title: string, icon: string) {
    checkNewPage()
    doc.setFillColor(...C.accent)
    doc.rect(M, y - 4, CW, 13, 'F')
    doc.setDrawColor(...C.prim)
    doc.setLineWidth(0.7)
    doc.line(M, y - 4, M, y + 9)
    doc.setTextColor(...C.prim)
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${icon}  ${title}`, M + 5, y + 4)
    y += 18
  }

  function drawTable2Col(heading: [string, string], rows: [string, string][]) {
    const c1 = 72,
      c2 = CW - c1,
      rH = 9.5
    checkNewPage()
    doc.setFillColor(...C.dark)
    doc.rect(M, y, c1, rH, 'F')
    doc.rect(M + c1, y, c2, rH, 'F')
    doc.setTextColor(...C.white)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(heading[0], M + 3, y + 6.5)
    doc.text(heading[1], M + c1 + 3, y + 6.5)
    y += rH
    rows.forEach((row, i) => {
      checkNewPage()
      doc.setFillColor(...(i % 2 === 0 ? C.light : C.white))
      doc.rect(M, y, c1, rH, 'F')
      doc.rect(M + c1, y, c2, rH, 'F')
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.15)
      doc.rect(M, y, c1, rH)
      doc.rect(M + c1, y, c2, rH)
      doc.setTextColor(...C.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.text(row[0], M + 3, y + 6.5)
      doc.setTextColor(...C.dark)
      doc.setFont('helvetica', 'bold')
      doc.text(row[1], M + c1 + 3, y + 6.5)
      y += rH
    })
    y += 10
  }

  function drawStatCells(stats: { label: string; value: string; color: RGB }[]) {
    const cellW = (CW - 3) / 4,
      cellH = 26
    checkNewPage()
    stats.forEach((s, i) => {
      const bx = M + i * (cellW + 1)
      doc.setFillColor(...s.color)
      doc.roundedRect(bx, y, cellW, cellH, 2, 2, 'F')
      doc.setTextColor(...C.white)
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.text(s.value, bx + cellW / 2, y + 13, { align: 'center' })
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text(s.label, bx + cellW / 2, y + 22, { align: 'center' })
    })
    y += cellH + 10
  }

  // ── COVER PAGE ───────────────────────────────────────────────────────────────
  // Dark header band
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, 52, 'F')
  doc.setDrawColor(...C.prim)
  doc.setLineWidth(0.8)
  doc.line(0, 52, W, 52)

  // Logo (if available)
  let logoEndX = M
  if (biz.logoDataUrl) {
    try {
      doc.addImage(biz.logoDataUrl, 'PNG', M, 12, 15, 15)
      logoEndX = M + 19
    } catch {
      /* ignore */
    }
  }

  // App name
  doc.setTextColor(...C.white)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(brandNameUpper, logoEndX, 28)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.slate4)
  doc.text('Plataforma de Investigación y Alcance Inteligente', logoEndX, 40)

  // Business info line under header
  const bizInfoParts: string[] = []
  if (biz.nif) bizInfoParts.push(biz.nif)
  if (biz.phone) bizInfoParts.push(biz.phone)
  if (biz.email) bizInfoParts.push(biz.email)
  if (bizInfoParts.length > 0) {
    doc.setTextColor(...C.slate4)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(bizInfoParts.join('  ·  '), logoEndX, 47)
  }

  // Pill top-right
  doc.setFillColor(...C.prim)
  doc.roundedRect(W - 60, 14, 46, 22, 3, 3, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORME', W - 37, 24, { align: 'center' })
  doc.setFontSize(7.5)
  doc.text('DE CAMPAÑA', W - 37, 32, { align: 'center' })

  // Report title
  y = 76
  doc.setTextColor(...C.dark)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const titleStr =
    report.campaignName.length > 34 ? report.campaignName.slice(0, 34) + '…' : report.campaignName
  doc.text(titleStr, M, y)
  doc.setDrawColor(...C.prim)
  doc.setLineWidth(1.2)
  doc.line(M, y + 5, M + Math.min(titleStr.length * 5.2, CW * 0.72), y + 5)

  // Prepared for
  y = 104
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text('PREPARADO PARA', M, y)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text(report.clientName, M, y + 14)

  // Detail rows
  y = 136
  const details: [string, string][] = [
    ['Campaña', report.campaignName],
    ['Canal', report.channel],
    ['Tipo', report.campaignType],
    ['Periodo', report.period],
    ['Fecha del informe', report.createdAt],
  ]
  doc.setFontSize(8.5)
  details.forEach(([label, val]) => {
    doc.setTextColor(...C.muted)
    doc.setFont('helvetica', 'normal')
    doc.text(label, M, y)
    doc.setTextColor(...C.dark)
    doc.setFont('helvetica', 'bold')
    doc.text(val, M + 56, y)
    y += 9
  })

  // Divider
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(M, y + 4, W - M, y + 4)
  y += 14

  // Stats cells on cover
  drawStatCells([
    { label: 'CONTACTOS', value: String(report.contactCount), color: C.prim },
    { label: 'ENVIADOS', value: String(report.sentCount), color: C.green },
    { label: 'RESPUESTAS', value: String(report.responseCount), color: C.purple },
    { label: 'FALLIDOS', value: String(report.failedCount), color: C.red },
  ])

  // Cover footer
  doc.setFillColor(...C.dark)
  doc.rect(0, H - 16, W, 16, 'F')
  doc.setTextColor(...C.slate4)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generado por ${brandName} — Plataforma de Investigación y Outreach Inteligente`,
    W / 2,
    H - 6,
    { align: 'center' },
  )

  // ── CONTENT PAGES ────────────────────────────────────────────────────────────
  doc.addPage()
  addPageHeader()
  y = 28

  // Executive summary
  sectionHeading('Resumen Ejecutivo', '📋')
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.dark)
  const summaryText =
    `Esta campaña de ${report.channel.toLowerCase()} fue realizada para ${report.clientName} durante el periodo ${report.period}. ` +
    `Se investigaron y analizaron ${report.contactCount} contactos de alta relevancia mediante análisis de inteligencia artificial. ` +
    `De ellos, ${report.sentCount} recibieron el mensaje personalizado, obteniendo ${report.responseCount} respuestas directas ` +
    `(${report.responseRate}% de tasa de respuesta). ` +
    `El proceso automatizado de Vibe Reach optimizó cada etapa, desde la selección de contactos hasta la ejecución del envío masivo.`
  const summaryLines = doc.splitTextToSize(summaryText, CW)
  doc.text(summaryLines, M, y)
  y += summaryLines.length * 5.2 + 12

  // Campaign data table
  sectionHeading('Datos Generales de la Campaña', '📊')
  drawTable2Col(
    ['Campo', 'Valor'],
    [
      ['Nombre de Campaña', report.campaignName],
      ['Cliente / Destinatario', report.clientName],
      ['Canal de Comunicación', report.channel],
      ['Tipo de Campaña', report.campaignType],
      ['Periodo de Ejecución', report.period],
      [
        'Asunto del Mensaje',
        report.subject.length > 52 ? report.subject.slice(0, 52) + '…' : report.subject,
      ],
      ['Fecha de Generación', report.createdAt],
    ],
  )

  // Outreach results
  sectionHeading('Resultados de Outreach', '📤')
  drawStatCells([
    { label: 'TOTAL CONTACTOS', value: String(report.contactCount), color: C.prim },
    { label: 'ENVIADOS', value: String(report.sentCount), color: C.green },
    { label: 'FALLIDOS', value: String(report.failedCount), color: C.red },
    { label: 'TASA RESPUESTA', value: `${report.responseRate}%`, color: C.purple },
  ])
  drawTable2Col(
    ['Métrica', 'Resultado'],
    [
      ['Contactos descubiertos', String(report.contactCount)],
      ['Mensajes enviados', String(report.sentCount)],
      ['Mensajes fallidos', String(report.failedCount)],
      ['Respuestas recibidas', String(report.responseCount)],
      ['Tasa de respuesta', `${report.responseRate}%`],
      ['Tasa de entrega', `${Math.round((report.sentCount / report.contactCount) * 100)}%`],
    ],
  )

  // Relevance analysis
  sectionHeading('Análisis de Relevancia de Contactos', '🎯')
  const quality = report.avgScore >= 75 ? '🟢 Alta' : report.avgScore >= 55 ? '🟡 Media' : '🔴 Baja'
  drawTable2Col(
    ['Indicador', 'Puntuación'],
    [
      ['Puntuación promedio', `${report.avgScore} / 100`],
      ['Puntuación más alta', `${report.highScore} / 100`],
      ['Puntuación más baja', `${report.lowScore} / 100`],
      ['Calidad general', quality],
    ],
  )

  // Categories
  sectionHeading('Distribución por Categorías', '🗂️')
  drawTable2Col(
    ['Categoría', 'Contactos'],
    report.categories.map(
      (c) =>
        [c.cat, `${c.count}  (${Math.round((c.count / report.contactCount) * 100)}%)`] as [
          string,
          string,
        ],
    ),
  )

  // Recommendations
  sectionHeading('Recomendaciones Estratégicas', '💡')
  const recs = [
    `Realizar seguimiento personalizado con los ${report.responseCount} contactos que respondieron para maximizar la conversión.`,
    `Analizar el patrón de los ${report.failedCount} envíos fallidos para optimizar la validación de contactos antes del próximo envío.`,
    `La categoría con mayor puntuación debe ser priorizada en la siguiente campaña para obtener mejores resultados.`,
    `Implementar una secuencia de follow-up 5–7 días después del envío inicial para aumentar la tasa de respuesta.`,
    `Ajustar el mensaje basándose en las respuestas recibidas para identificar qué propuesta de valor resulta más atractiva.`,
  ]
  doc.setFontSize(9.5)
  recs.forEach((rec) => {
    checkNewPage()
    doc.setFillColor(...C.prim)
    doc.circle(M + 2.5, y - 1.5, 1.8, 'F')
    doc.setTextColor(...C.dark)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(rec, CW - 9)
    doc.text(lines, M + 7, y)
    y += lines.length * 5.2 + 5
  })

  // Add footers to all content pages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p)
    addPageFooter(p, totalPages)
  }

  // Trigger download
  const safeName = `${report.fileNamePrefix}-${report.clientName.toLowerCase().replace(/\s+/g, '-')}-${report.campaignName
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .slice(0, 28)}`
  const dated = report.includeDate ? `-${new Date().toISOString().slice(0, 10)}` : ''
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}${dated}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Investigation PDF generation ─────────────────────────────────────────────
async function downloadInvestigationPDF(report: Report, biz: BusinessProfile) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210,
    H = 297,
    M = 20,
    CW = W - M * 2

  type RGB = [number, number, number]
  const C: Record<string, RGB> = {
    dark: [15, 23, 42],
    prim: [99, 102, 241],
    muted: [100, 116, 139],
    border: [226, 232, 240],
    light: [248, 250, 252],
    white: [255, 255, 255],
    accent: [238, 242, 255],
    slate4: [148, 163, 184],
    teal: [20, 184, 166],
  }

  const date = report.createdAt
  const invBrandName = biz.companyName || 'VIBE REACH'
  const invBrandUpper = invBrandName.toUpperCase()
  let y = 0

  function addContentHeader() {
    doc.setFillColor(...C.prim)
    doc.rect(0, 0, W, 14, 'F')
    doc.setTextColor(...C.white)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${invBrandUpper}  ·  ANÁLISIS DE INVESTIGACIÓN`, M, 9)
    doc.text(`${report.campaignName}`, W - M, 9, { align: 'right' })
  }

  function addContentFooter(pg: number, total: number) {
    doc.setFillColor(...C.dark)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setTextColor(...C.slate4)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Página ${pg} de ${total}`, M, H - 4.5)
    doc.text(`${invBrandName} — Análisis de Investigación`, W / 2, H - 4.5, { align: 'center' })
    doc.text(date, W - M, H - 4.5, { align: 'right' })
  }

  function check() {
    if (y > 254) {
      doc.addPage()
      addContentHeader()
      y = 26
    }
  }

  // ── Cover ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, 52, 'F')
  doc.setFillColor(...C.prim)
  doc.rect(0, 52, W, 3, 'F')

  // Logo (if available)
  let invLogoEndX = M
  if (biz.logoDataUrl) {
    try {
      doc.addImage(biz.logoDataUrl, 'PNG', M, 12, 15, 15)
      invLogoEndX = M + 19
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(...C.white)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(invBrandUpper, invLogoEndX, 28)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.slate4)
  doc.text('Plataforma de Investigación y Alcance Inteligente', invLogoEndX, 40)

  // Business info line
  const invBizParts: string[] = []
  if (biz.nif) invBizParts.push(biz.nif)
  if (biz.phone) invBizParts.push(biz.phone)
  if (biz.email) invBizParts.push(biz.email)
  if (invBizParts.length > 0) {
    doc.setTextColor(...C.slate4)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(invBizParts.join('  ·  '), invLogoEndX, 47)
  }

  doc.setFillColor(...C.teal)
  doc.roundedRect(W - 60, 14, 46, 22, 3, 3, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ANÁLISIS', W - 37, 24, { align: 'center' })
  doc.text('INVESTIGACIÓN', W - 37, 32, { align: 'center' })

  y = 76
  doc.setTextColor(...C.dark)
  doc.setFontSize(21)
  doc.setFont('helvetica', 'bold')
  const title =
    report.campaignName.length > 36 ? report.campaignName.slice(0, 36) + '…' : report.campaignName
  doc.text(title, M, y)
  doc.setDrawColor(...C.prim)
  doc.setLineWidth(1.2)
  doc.line(M, y + 5, M + Math.min(title.length * 4.9, CW * 0.75), y + 5)

  y = 106
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text('CLIENTE', M, y)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text(report.clientName, M, y + 13)

  y = 136
  const meta: [string, string][] = [
    ['Campaña', report.campaignName],
    ['Canal', report.channel],
    ['Periodo', report.period],
    ['Fecha del informe', date],
  ]
  doc.setFontSize(8.5)
  meta.forEach(([lbl, val]) => {
    doc.setTextColor(...C.muted)
    doc.setFont('helvetica', 'normal')
    doc.text(lbl, M, y)
    doc.setTextColor(...C.dark)
    doc.setFont('helvetica', 'bold')
    doc.text(val, M + 52, y)
    y += 9
  })

  doc.setFillColor(...C.dark)
  doc.rect(0, H - 16, W, 16, 'F')
  doc.setTextColor(...C.slate4)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado por ${invBrandName} — Análisis de Afinidad e Investigación IA`, W / 2, H - 6, {
    align: 'center',
  })

  // ── Content pages: render markdown ────────────────────────────────────────
  doc.addPage()
  addContentHeader()
  y = 28

  const md = report.investigationMarkdown ?? '*(Sin análisis de investigación disponible)*'
  const rawLines = md.split('\n')

  // Collect table rows then flush
  let tableRows: string[][] = []

  function flushTable() {
    if (tableRows.length === 0) return
    const dataRows = tableRows.filter((r) => !r.every((cell) => /^[-:]+$/.test(cell.trim())))
    if (dataRows.length < 2) {
      tableRows = []
      return
    }
    const colCount = dataRows[0].length
    const colW = CW / colCount
    const rH = 9
    check()
    // Header row
    doc.setFillColor(...C.dark)
    dataRows[0].forEach((cell, ci) => {
      doc.rect(M + ci * colW, y, colW, rH, 'F')
      doc.setTextColor(...C.white)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      const t = cell.trim().replace(/\*\*/g, '').slice(0, 28)
      doc.text(t, M + ci * colW + 2.5, y + 6.5)
    })
    y += rH
    // Data rows
    dataRows.slice(1).forEach((row, ri) => {
      check()
      doc.setFillColor(...(ri % 2 === 0 ? C.light : C.white))
      row.forEach((cell, ci) => {
        doc.rect(M + ci * colW, y, colW, rH, 'F')
        doc.setDrawColor(...C.border)
        doc.setLineWidth(0.12)
        doc.rect(M + ci * colW, y, colW, rH)
        doc.setTextColor(...C.dark)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        const t = cell.trim().replace(/\*\*/g, '').slice(0, 30)
        doc.text(t, M + ci * colW + 2.5, y + 6.5)
      })
      y += rH
    })
    y += 8
    tableRows = []
  }

  for (const raw of rawLines) {
    const line = raw.trimEnd()

    // Blank line
    if (line.trim() === '') {
      flushTable()
      y += 3
      continue
    }

    // Table row
    if (line.trim().startsWith('|')) {
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1)
      tableRows.push(cells)
      continue
    }

    flushTable()

    // H1
    if (line.startsWith('# ')) {
      check()
      doc.setFillColor(...C.accent)
      doc.rect(M - 3, y - 5, CW + 6, 14, 'F')
      doc.setDrawColor(...C.prim)
      doc.setLineWidth(0.8)
      doc.line(M - 3, y - 5, M - 3, y + 9)
      doc.setTextColor(...C.prim)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(line.slice(2).replace(/\*\*/g, ''), M + 4, y + 4)
      y += 18
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      check()
      doc.setDrawColor(...C.prim)
      doc.setLineWidth(0.4)
      doc.setTextColor(...C.prim)
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.text(line.slice(3).replace(/\*\*/g, ''), M, y)
      doc.line(M, y + 3, W - M, y + 3)
      y += 12
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      check()
      doc.setTextColor(...C.muted)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(line.slice(4).replace(/\*\*/g, '').toUpperCase(), M, y)
      y += 9
      continue
    }

    // Bullet
    if (/^[-*] /.test(line)) {
      check()
      const text = line.slice(2).replace(/\*\*/g, '').replace(/\*/g, '')
      doc.setFillColor(...C.prim)
      doc.circle(M + 2, y - 1.5, 1.5, 'F')
      doc.setTextColor(...C.dark)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const parts = doc.splitTextToSize(text, CW - 9)
      doc.text(parts, M + 6, y)
      y += parts.length * 5 + 3
      continue
    }

    // Normal paragraph
    check()
    const plain = line.replace(/\*\*/g, '').replace(/\*/g, '')
    doc.setTextColor(...C.dark)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const parts = doc.splitTextToSize(plain, CW)
    doc.text(parts, M, y)
    y += parts.length * 5 + 4
  }
  flushTable()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p)
    addContentFooter(p, totalPages)
  }

  const safeName = `analisis-${report.campaignName
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .slice(0, 30)}`
  const dated = report.includeDate ? `-${new Date().toISOString().slice(0, 10)}` : ''
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}${dated}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Domain Memory Summary ──────────────────────────────────────────────────────

function DomainMemorySummary() {
  const records = useDomainMemoryStore((s) => s.records)
  const allRecords = Object.values(records)
  if (allRecords.length === 0) return null

  const totalDomains = allRecords.length
  const totalOutreach = allRecords.reduce((s, r) => s + r.outreachAttempted, 0)
  const totalForms = allRecords.reduce((s, r) => s + r.formSubmissions, 0)
  const totalEmails = allRecords.reduce((s, r) => s + r.emailsOpened, 0)

  // Top domains by outreach attempts
  const topDomains = [...allRecords]
    .sort((a, b) => b.outreachAttempted - a.outreachAttempted)
    .slice(0, 5)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-violet-400" />
        <h3 className="text-xs font-semibold">Memoria de dominios</h3>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Dominios', value: totalDomains },
          { label: 'Outreach', value: totalOutreach },
          { label: 'Formularios', value: totalForms },
          { label: 'Emails', value: totalEmails },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {topDomains.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top dominios
          </p>
          {topDomains.map((r) => (
            <div
              key={r.domain}
              className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/30"
            >
              <span className="truncate flex-1">{r.domain}</span>
              <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                {r.outreachAttempted} int · {r.formSubmissions} form · {r.emailsOpened} email
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
interface ReportsViewProps {
  onNavigate: (tab: TabId) => void
}

export function ReportsView({ onNavigate: _ }: ReportsViewProps) {
  const { t } = useTranslation()
  const { lastAnalysisMarkdown } = useInvestigationStore()
  const { reports, addReport, deleteReport } = useReportsStore()
  const { campaigns } = useCampaignStore()
  const allContacts = useContactsStore((s) => s.contacts)
  const settings = useSettingsStore()
  const biz = useBusinessStore()

  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [clientName, setClientName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState<{
    id: string
    type: 'analysis' | 'campaign'
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // If store has real campaigns, use them; otherwise show demo options
  const hasRealCampaigns = campaigns.length > 0
  const campaignOptions = hasRealCampaigns
    ? campaigns.map((c) => {
        const stats = getCampaignStats(c, allContacts)
        return { id: c.id, name: c.name, ...stats, type: 'Outreach', isDemoData: false as const }
      })
    : DEMO_CAMPAIGNS.map((c) => ({ ...c, isDemoData: true as const }))

  function handleGenerate() {
    if (!selectedId || !clientName.trim()) return
    const option = campaignOptions.find((c) => c.id === selectedId)
    if (!option) return
    setGenerating(true)
    setTimeout(() => {
      const newReport: Omit<Report, 'id'> = {
        campaignId: option.id,
        campaignName: option.name,
        clientName: clientName.trim(),
        channel: option.channel,
        campaignType: option.type,
        subject: option.subject,
        period: option.period,
        contactCount: option.contactCount,
        sentCount: option.sentCount,
        failedCount: option.failedCount,
        responseCount: option.responseCount,
        responseRate: option.responseRate,
        avgScore: option.avgScore,
        highScore: option.highScore,
        lowScore: option.lowScore,
        createdAt: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        categories: option.categories,
        downloadFolder: settings.downloadFolder,
        fileNamePrefix: settings.fileNamePrefix,
        includeDate: settings.includeDate,
        investigationMarkdown: lastAnalysisMarkdown || undefined,
      }
      addReport(newReport)
      setGenerating(false)
      setShowForm(false)
      setSelectedId('')
      setClientName('')
    }, 1800)
  }

  async function handleDownload(report: Report, type: 'analysis' | 'campaign') {
    setDownloading({ id: report.id, type })
    try {
      if (type === 'analysis') await downloadInvestigationPDF(report, biz)
      else await downloadPDF(report, biz)
    } finally {
      setDownloading(null)
    }
  }

  function handleDelete(id: string) {
    deleteReport(id)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">{t('reports.title')}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t('reports.count', { count: reports.length })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? t('reports.close') : t('reports.new')}
        </Button>
      </div>

      {/* ── Generate form ── */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-accent p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">{t('reports.generateNew')}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('reports.campaignLabel')}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t('reports.selectCampaignPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {campaignOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.channel === 'Email' ? '✉️' : c.channel === 'LinkedIn' ? '💼' : '🌐'}{' '}
                      {c.name}
                    </SelectItem>
                  ))}
                  {campaignOptions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {t('reports.noCampaigns')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {!hasRealCampaigns && campaignOptions.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60">{t('reports.demoDataHint')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                {t('reports.clientLabel')}{' '}
                <span className="text-muted-foreground font-normal">
                  ({t('reports.clientHint')})
                </span>
              </Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t('reports.clientPlaceholder')}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">{t('reports.clientPdfHint')}</p>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            disabled={!selectedId || !clientName.trim() || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-primary-foreground animate-spin inline-block" />
                {t('reports.generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {t('reports.generatePdf')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── Report list ── */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <p className="text-4xl">📋</p>
          <p className="text-sm font-medium">{t('reports.noReports')}</p>
          <p className="text-xs text-muted-foreground">{t('reports.noReportsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const ch = CH_CFG[report.channel] ?? CH_CFG['Email']
            const initials =
              (report.clientName ?? '')
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0] ?? '')
                .join('')
                .toUpperCase() || '??'

            return (
              <div
                key={report.id}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
              >
                {/* Gradient header */}
                <div
                  className={`bg-linear-to-r ${ch.grad} ${CH_FALLBACK[report.channel]} px-4 py-3.5 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-bold leading-tight truncate">
                        {report.clientName ?? ''}
                      </p>
                      <p className="text-white/65 text-[10px] mt-0.5">{t('reports.preparedFor')}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-2xl">{ch.icon}</span>
                    <p className="text-white/70 text-[10px] mt-0.5">{report.channel}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="bg-card px-4 pt-3 pb-4 space-y-3">
                  {/* Campaign + date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{report.campaignName}</p>
                      <p className="text-[11px] text-muted-foreground">{report.campaignType}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium">{report.createdAt}</p>
                      <p className="text-[10px] text-muted-foreground">{report.period}</p>
                    </div>
                  </div>

                  {/* Stat chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                      👥 {report.contactCount} {t('reports.contacts')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                      ✅ {report.sentCount} {t('reports.sent')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium border border-border">
                      📩 {report.responseCount} {t('reports.responses')} · {report.responseRate}%
                    </span>
                    {report.failedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium border border-destructive/20">
                        ❌ {report.failedCount} {t('reports.failed')}
                      </span>
                    )}
                  </div>

                  {/* Score bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('reports.avgScore')}</span>
                      <span className="font-medium text-foreground">{report.avgScore}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${report.avgScore}%` }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  {/* Download selector */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                      <FileDown className="w-3 h-3" />
                      {t('reports.downloadPdf')}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleDownload(report, 'analysis')}
                        disabled={!!downloading}
                        title={
                          report.investigationMarkdown
                            ? t('reports.analysisAvailable')
                            : t('reports.analysisUnavailable')
                        }
                      >
                        {downloading?.id === report.id && downloading.type === 'analysis' ? (
                          <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-primary animate-spin inline-block" />
                        ) : (
                          <Search className="w-3 h-3" />
                        )}
                        {t('reports.analysis')}
                        {!report.investigationMarkdown && (
                          <span className="text-[9px] text-muted-foreground/60 ml-0.5">*</span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-[11px] gap-1.5"
                        onClick={() => handleDownload(report, 'campaign')}
                        disabled={!!downloading}
                      >
                        {downloading?.id === report.id && downloading.type === 'campaign' ? (
                          <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-primary-foreground animate-spin inline-block" />
                        ) : (
                          <Rocket className="w-3 h-3" />
                        )}
                        {t('reports.campaignPdf')}
                      </Button>
                    </div>
                    {!report.investigationMarkdown && (
                      <p className="text-[10px] text-muted-foreground/50">
                        * {t('reports.analysisUnavailableHint')}
                      </p>
                    )}
                  </div>

                  {/* Delete with confirmation */}
                  {confirmDelete === report.id ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <p className="text-[11px] text-destructive flex-1">
                        {t('reports.deleteConfirm')}
                      </p>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="h-6 px-2 rounded text-[11px] font-medium bg-destructive text-white hover:bg-destructive/80 transition-colors"
                      >
                        {t('reports.deleteYes')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="h-6 px-2 rounded text-[11px] font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t('reports.deleteNo')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(report.id)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t('reports.deleteReport')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Domain Memory Summary ── */}
      <DomainMemorySummary />
    </div>
  )
}
