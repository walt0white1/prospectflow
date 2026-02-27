// ============================================================
// ProspectFlow — Types TypeScript centraux
// ============================================================

// ------------------------------------------------------------
// Enums (mirroir du schema Prisma)
// ------------------------------------------------------------

export type ProspectStatus =
  | 'NEW'
  | 'AUDITED'
  | 'CONTACTED'
  | 'OPENED'
  | 'REPLIED'
  | 'MEETING'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST'
  | 'BLACKLIST'

export type Priority = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'COLD'

export type Source = 'OPENSTREETMAP' | 'GOOGLE_MAPS' | 'MANUAL' | 'IMPORT_CSV'

export type EmailStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENT'
  | 'OPENED'
  | 'CLICKED'
  | 'REPLIED'
  | 'BOUNCED'
  | 'FAILED'

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export type TemplateType =
  | 'FIRST_CONTACT'
  | 'FOLLOW_UP_1'
  | 'FOLLOW_UP_2'
  | 'FOLLOW_UP_3'
  | 'AUDIT_REPORT'
  | 'PROPOSAL'
  | 'CUSTOM'

// ------------------------------------------------------------
// Overpass API (OpenStreetMap)
// ------------------------------------------------------------

export interface OSMElement {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export interface OSMResult {
  osmId: string
  companyName: string
  address?: string
  city: string
  postalCode?: string
  phone?: string
  website?: string
  email?: string
  lat?: number
  lng?: number
  osmTags?: Record<string, string>
  industry: string
}

export interface OverpassSearchParams {
  category: string
  city: string
  radiusKm: number
  limit: number
  onlyWithWebsite?: boolean
  includeWithoutWebsite?: boolean
}

// ------------------------------------------------------------
// Enrichissement Google Maps (scraping Playwright)
// ------------------------------------------------------------

export interface EnrichmentData {
  googleRating?: number
  googleReviewCount?: number
  website?: string
  phone?: string
  email?: string
  address?: string
  googlePlaceId?: string
}

// ------------------------------------------------------------
// Audit technique (Playwright scraper)
// ------------------------------------------------------------

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IssueCategory =
  | 'performance'
  | 'security'
  | 'mobile'
  | 'seo'
  | 'design'
  | 'legal'

export interface AuditIssue {
  id: string
  label: string
  severity: IssueSeverity
  category: IssueCategory
  description: string
  recommendation: string
}

export interface AuditResult {
  url: string
  timestamp: Date

  // Performance
  loadTime: number         // secondes
  pageSize: number         // Ko
  numberOfRequests: number

  // Sécurité
  hasSSL: boolean
  sslExpiry?: Date

  // Mobile
  isResponsive: boolean
  mobileScore: number      // 0-100

  // SEO
  hasTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  hasOpenGraph: boolean
  hasSitemap: boolean
  hasRobotsTxt: boolean
  seoScore: number         // 0-100

  // Design & Tech
  techStack: string[]
  cmsVersion?: string
  designAge: number        // Année estimée
  lastModified?: Date

  // Problèmes détectés
  issues: AuditIssue[]

  // Screenshots
  screenshotDesktop?: string  // Base64
  screenshotMobile?: string
}

// ------------------------------------------------------------
// Prospect (modèle enrichi côté frontend)
// ------------------------------------------------------------

export interface Prospect {
  id: string

  // Infos entreprise
  companyName: string
  industry: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city: string
  postalCode?: string | null
  country: string

  // OSM
  osmId?: string | null
  osmTags?: Record<string, string> | null
  lat?: number | null
  lng?: number | null

  // Google Maps
  googleRating?: number | null
  googleReviewCount?: number | null
  googlePlaceId?: string | null

  // Site web
  website?: string | null
  hasWebsite: boolean

  // Audit
  auditData?: AuditResult | null
  loadTime?: number | null
  mobileScore?: number | null
  seoScore?: number | null
  sslValid?: boolean | null
  isResponsive?: boolean | null
  techStack: string[]
  designAge?: number | null
  issues?: AuditIssue[] | null

  // Scoring
  prospectScore: number
  siteScore?: number | null
  priority: Priority

  // CRM
  status: ProspectStatus
  source: Source

  // Emails
  emailsSent: number
  lastEmailAt?: Date | null
  emailOpened: boolean
  emailClicked: boolean
  replied: boolean

  // Meta
  tags: string[]
  createdAt: Date
  updatedAt: Date
  lastContactAt?: Date | null
  nextFollowUp?: Date | null

  // Relations
  notes?: Note[]
  emails?: Email[]
  campaignId?: string | null
}

// ------------------------------------------------------------
// Note
// ------------------------------------------------------------

export interface Note {
  id: string
  content: string
  prospectId: string
  createdAt: Date
}

// ------------------------------------------------------------
// Email
// ------------------------------------------------------------

export interface Email {
  id: string
  subject: string
  body: string
  bodyHtml?: string | null
  status: EmailStatus
  sentAt?: Date | null
  openedAt?: Date | null
  clickedAt?: Date | null
  repliedAt?: Date | null
  brevoMsgId?: string | null
  prospectId: string
  campaignId?: string | null
  createdAt: Date
}

// ------------------------------------------------------------
// Campaign
// ------------------------------------------------------------

export interface CampaignSequenceStep {
  delay: number      // jours après le premier email
  templateId: string
}

export interface Campaign {
  id: string
  name: string
  description?: string | null
  status: CampaignStatus
  targetCity?: string | null
  targetIndustry?: string | null
  minScore?: number | null
  maxProspects?: number | null
  sequence?: CampaignSequenceStep[] | null
  totalSent: number
  totalOpened: number
  totalReplied: number
  totalMeetings: number
  createdAt: Date
  updatedAt: Date
}

// ------------------------------------------------------------
// Email Template
// ------------------------------------------------------------

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: TemplateType
  createdAt: Date
  updatedAt: Date
}

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------

export interface Settings {
  id: string
  brevoApiKey?: string | null
  brevoFromEmail?: string | null
  brevoFromName?: string | null
  anthropicKey?: string | null
  dailyEmailLimit: number
  delayBetweenEmails: number
  defaultCity?: string | null
  defaultIndustry?: string | null
  defaultSearchRadius: number
  autoAudit: boolean
}

// ------------------------------------------------------------
// Génération email par IA
// ------------------------------------------------------------

export type EmailTone = 'professional' | 'friendly' | 'direct'

export interface EmailGenerationParams {
  prospect: Prospect
  audit?: AuditResult | null
  templateType: TemplateType
  tone: EmailTone
  userName: string
  userCompany: string
  userPhone?: string
  customInstructions?: string
}

export interface GeneratedEmail {
  subject: string
  body: string
  bodyHtml: string
}

// ------------------------------------------------------------
// API responses génériques
// ------------------------------------------------------------

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ------------------------------------------------------------
// Filtres prospects
// ------------------------------------------------------------

export interface ProspectFilters {
  search?: string
  status?: ProspectStatus[]
  priority?: Priority[]
  source?: Source[]
  city?: string
  industry?: string
  minScore?: number
  maxScore?: number
  hasWebsite?: boolean
  emailSent?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'prospectScore' | 'createdAt' | 'updatedAt' | 'companyName'
  sortOrder?: 'asc' | 'desc'
}

// ------------------------------------------------------------
// Dashboard stats
// ------------------------------------------------------------

export interface DashboardStats {
  totalProspects: number
  hotProspects: number
  emailsSentThisMonth: number
  openRate: number
  replyRate: number
  meetingsThisMonth: number
}

// ------------------------------------------------------------
// Brevo webhook
// ------------------------------------------------------------

export interface BrevoWebhookEvent {
  event: 'opened' | 'clicked' | 'hard_bounce' | 'soft_bounce' | 'unsubscribed' | 'delivered'
  email: string
  'message-id': string
  ts: number
  ts_event: number
  subject?: string
  tag?: string
}
