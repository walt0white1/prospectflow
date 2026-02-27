import type { MockProspect } from './mock-prospects'
import { MOCK_PROSPECTS } from './mock-prospects'

// ── Extended types ───────────────────────────────────────────────────────────

export type MockEmail = {
  id: string
  subject: string
  preview: string
  sentAt: string
  status: 'SENT' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED'
  openedAt: string | null
  clickedAt: string | null
  repliedAt: string | null
}

export type MockNote = {
  id: string
  content: string
  createdAt: string
}

export type MockAuditIssue = {
  label: string
  severity: 'high' | 'medium' | 'low'
}

export type MockAudit = {
  mobileScore: number
  seoScore: number
  performanceScore: number
  scannedAt: string
  issues: MockAuditIssue[]
}

export type ProspectDetail = MockProspect & {
  emails: MockEmail[]
  notes: MockNote[]
  audit: MockAudit | null
}

// ── Issue severity ────────────────────────────────────────────────────────────

const HIGH_TERMS = [
  'SSL', 'HTTPS', 'Non responsive', 'version mobile', 'Flash',
  'fermé', 'morts', 'non maintenu', 'Voilà', 'pagesperso', 'Orange',
  'obsolètes',
]
const MEDIUM_TERMS = [
  'obsolète', 'Wix', 'Jimdo', 'Vitesse', 'vitesse', 'SEO',
  'Contenu 20', 'générique', 'statique HTML', 'Mobile pas',
  'Non optimisé', 'WordPress', 'non responsive',
]

function getIssueSeverity(issue: string): 'high' | 'medium' | 'low' {
  if (HIGH_TERMS.some(t => issue.includes(t))) return 'high'
  // Chargement > 5s → critique
  const m = issue.match(/(\d+)s/)
  if (m && parseInt(m[1]) >= 5) return 'high'
  if (MEDIUM_TERMS.some(t => issue.toLowerCase().includes(t.toLowerCase()))) return 'medium'
  return 'low'
}

// ── Email generators ──────────────────────────────────────────────────────────

const EMAIL_SUBJECTS = [
  (name: string) => `Votre présence en ligne — ${name}`,
  (_: string)    => `Suite à notre premier échange`,
  (name: string) => `Proposition refonte site pour ${name}`,
  (_: string)    => `Relance — Votre projet web`,
  (_: string)    => `Dernière proposition avant clôture`,
]

const EMAIL_PREVIEWS = [
  `Bonjour, j'ai analysé votre présence digitale et identifié plusieurs opportunités d'amélioration importantes qui pourraient vous apporter de nouveaux clients.`,
  `Suite à mon email précédent, je voulais vous présenter quelques exemples de sites que nous avons réalisés dans votre secteur d'activité.`,
  `Comme convenu, voici notre proposition détaillée pour la refonte complète de votre présence en ligne, avec un budget adapté à votre activité.`,
  `Je me permets de revenir vers vous concernant notre échange. Avez-vous eu l'occasion de réfléchir à notre proposition ?`,
  `Je tenais à vous soumettre une dernière offre spéciale avant de clore ce dossier, avec une remise exceptionnelle de 20%.`,
]

function getEmailStatus(
  prospect: MockProspect,
  index: number,
  total: number,
): MockEmail['status'] {
  const isLast = index === total - 1
  const st = prospect.status
  if (isLast) {
    if (['REPLIED', 'MEETING', 'PROPOSAL', 'WON'].includes(st)) return 'REPLIED'
    if (st === 'OPENED') return 'OPENED'
    if (st === 'CLICKED') return 'CLICKED'
    if (st === 'CONTACTED') return 'SENT'
  }
  // older emails were opened
  return 'OPENED'
}

export function generateMockEmails(prospect: MockProspect): MockEmail[] {
  if (prospect.emailsSent === 0) return []

  const base = prospect.lastEmailAt
    ? new Date(prospect.lastEmailAt).getTime()
    : Date.now() - 3 * 86_400_000

  return Array.from({ length: prospect.emailsSent }, (_, i) => {
    const sentAt = new Date(
      base - (prospect.emailsSent - 1 - i) * 7 * 86_400_000,
    ).toISOString()
    const status = getEmailStatus(prospect, i, prospect.emailsSent)
    const openedAt =
      status !== 'SENT' && status !== 'BOUNCED'
        ? new Date(new Date(sentAt).getTime() + 2 * 3_600_000).toISOString()
        : null
    const repliedAt =
      status === 'REPLIED'
        ? new Date(new Date(sentAt).getTime() + 26 * 3_600_000).toISOString()
        : null

    return {
      id: `email-${prospect.id}-${i}`,
      subject: EMAIL_SUBJECTS[Math.min(i, EMAIL_SUBJECTS.length - 1)](
        prospect.companyName,
      ),
      preview: EMAIL_PREVIEWS[Math.min(i, EMAIL_PREVIEWS.length - 1)],
      sentAt,
      status,
      openedAt,
      clickedAt: null,
      repliedAt,
    }
  }).reverse() // le plus récent en premier
}

// ── Note generators ───────────────────────────────────────────────────────────

const NOTE_TEXTS = [
  `Prospect intéressant, très bonne réputation locale. Site web vraiment daté — potentiel élevé pour une refonte.`,
  `A répondu favorablement au premier email. Souhaite recevoir un devis détaillé avec exemples de réalisations.`,
  `Devis envoyé par email. Budget annoncé : 2 500–4 000€. Décision prévue dans 2 semaines.`,
  `Relancé par téléphone, très réceptif. RDV téléphonique fixé pour la semaine prochaine.`,
  `Meeting productif de 45 min. Valide le devis principal. En attente de signature du bon de commande.`,
  `Client gagné ! Démarrage projet prévu le mois prochain. À transférer à l'équipe production.`,
]

export function generateMockNotes(prospect: MockProspect): MockNote[] {
  const count = prospect._count.notes
  if (count === 0) return []

  const base = new Date(prospect.createdAt).getTime()
  return Array.from({ length: count }, (_, i) => ({
    id: `note-${prospect.id}-${i}`,
    content: NOTE_TEXTS[i % NOTE_TEXTS.length],
    createdAt: new Date(base + (i + 1) * 3 * 86_400_000).toISOString(),
  })).reverse() // la plus récente en premier
}

// ── Audit generator ───────────────────────────────────────────────────────────

export function generateMockAudit(prospect: MockProspect): MockAudit | null {
  if (!prospect.hasWebsite || prospect.siteScore === null) return null

  const base = prospect.siteScore
  // Variation cohérente avec le score global
  const perf = Math.max(5, Math.min(100, Math.round(base * 0.9 + (base % 7) - 3)))
  const seo  = Math.max(5, Math.min(100, Math.round(base * 1.1 - (base % 5) + 2)))
  const mob  = Math.max(5, Math.min(100, Math.round(base * 0.85 + (base % 9) - 4)))

  const issues: MockAuditIssue[] = (prospect.issues ?? []).map(label => ({
    label,
    severity: getIssueSeverity(label),
  }))

  // Compléter si peu de problèmes pour un mauvais score
  if (issues.length === 0 && base < 50) {
    issues.push(
      { label: 'Core Web Vitals insuffisants', severity: 'medium' },
      { label: 'Optimisation mobile insuffisante', severity: 'medium' },
    )
  }

  return {
    mobileScore: mob,
    seoScore: seo,
    performanceScore: perf,
    scannedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    issues,
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildProspectDetail(id: string): ProspectDetail | null {
  const prospect = MOCK_PROSPECTS.find(p => p.id === id)
  if (!prospect) return null
  return {
    ...prospect,
    emails: generateMockEmails(prospect),
    notes:  generateMockNotes(prospect),
    audit:  generateMockAudit(prospect),
  }
}
