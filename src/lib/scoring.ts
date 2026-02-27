// ── Algorithme de scoring des prospects ──────────────────────────────────────
// Score de 0 à 100 — plus le score est ÉLEVÉ, plus le prospect est intéressant
// (site absent, obsolète, lent) → fort potentiel de vente.

import type { OverpassProspect } from './overpass'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Priority = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'COLD'

export type ScoredProspect = OverpassProspect & {
  prospectScore: number   // 0–100
  priority: Priority
  siteScore: number | null
  issues: string[]        // Problèmes détectés (texte humain)
}

// ── Score helpers ─────────────────────────────────────────────────────────────

/**
 * Détecte si une URL pointe vers un constructeur de sites basique (Wix, Jimdo…)
 * qui indique souvent un site bas de gamme.
 */
const CHEAP_BUILDERS = [
  'wix.com', 'wixsite.com', 'jimdo.com', 'jimdofree.com',
  'webnode.fr', 'e-monsite.com', 'free.fr', 'perso.wanadoo.fr',
  'pagesperso-orange.fr', 'voila.fr', 'multimania.com',
  'over-blog.com', 'overblog.com', 'blogger.com',
  'wordpress.com', 'sites.google.com',
]

const HOSTING_CHEAP_BUILDERS = ['free.fr', 'orange.fr', 'sfr.fr', 'neuf.fr']

function detectCheapSite(website: string): string[] {
  const url = website.toLowerCase()
  const found: string[] = []
  for (const b of CHEAP_BUILDERS) {
    if (url.includes(b)) {
      found.push(`Site hébergé sur ${b} (constructeur basique)`)
    }
  }
  for (const h of HOSTING_CHEAP_BUILDERS) {
    if (url.includes(h) && !found.length) {
      found.push(`Site hébergé sur ${h} (hébergement gratuit/basique)`)
    }
  }
  return found
}

function detectHttp(website: string): boolean {
  return website.toLowerCase().startsWith('http://')
}

/**
 * Normalise une URL pour éviter les doublons.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

// ── Calcul du score ───────────────────────────────────────────────────────────

export type ScoreBreakdown = {
  total: number
  websiteAbsent: number
  httpOnly: number
  cheapBuilder: number
  noPhone: number
  noEmail: number
  noAddress: number
}

/**
 * Calcule le score de prospect à partir des données Overpass.
 * Score élevé = fort potentiel (site mauvais ou absent).
 *
 * Barème :
 *  +60  pas de site web → besoin fort
 *  +25  HTTP seulement (pas HTTPS) → site probablement vieux
 *  +15  constructeur cheap (Wix, Jimdo, Free…) → refonte possible
 *  +5   pas de téléphone listé → moins professionnel
 *  +5   pas d'email listé → moins professionnel
 *  +5   pas d'adresse complète → données incomplètes
 */
export function calculateProspectScore(prospect: OverpassProspect): ScoreBreakdown {
  let total = 0
  let websiteAbsent = 0
  let httpOnly = 0
  let cheapBuilder = 0
  let noPhone = 0
  let noEmail = 0
  let noAddress = 0

  if (!prospect.hasWebsite || !prospect.website) {
    websiteAbsent = 60
  } else {
    if (detectHttp(prospect.website)) {
      httpOnly = 25
    }
    const cheap = detectCheapSite(prospect.website)
    if (cheap.length > 0) {
      cheapBuilder = 15
    }
  }

  if (!prospect.phone) noPhone = 5
  if (!prospect.email) noEmail = 5
  if (!prospect.address) noAddress = 5

  total = Math.min(100, websiteAbsent + httpOnly + cheapBuilder + noPhone + noEmail + noAddress)

  return { total, websiteAbsent, httpOnly, cheapBuilder, noPhone, noEmail, noAddress }
}

export function getPriority(score: number): Priority {
  if (score >= 80) return 'HOT'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  if (score >= 20) return 'LOW'
  return 'COLD'
}

/**
 * Génère la liste des problèmes détectés pour l'affichage.
 */
function buildIssues(prospect: OverpassProspect, breakdown: ScoreBreakdown): string[] {
  const issues: string[] = []

  if (breakdown.websiteAbsent > 0) {
    issues.push('Aucun site web trouvé — opportunité directe')
  }
  if (breakdown.httpOnly > 0) {
    issues.push('Site en HTTP — pas de certificat SSL')
  }
  if (prospect.website) {
    const cheap = detectCheapSite(prospect.website)
    issues.push(...cheap)
  }
  if (breakdown.noPhone > 0) {
    issues.push('Aucun numéro de téléphone renseigné')
  }
  if (breakdown.noAddress > 0) {
    issues.push('Adresse non référencée sur OpenStreetMap')
  }

  return issues
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Convertit un OverpassProspect en ScoredProspect avec score + priorité + issues.
 */
export function buildScoredProspect(prospect: OverpassProspect): ScoredProspect {
  const breakdown = calculateProspectScore(prospect)
  const priority = getPriority(breakdown.total)
  const issues = buildIssues(prospect, breakdown)

  return {
    ...prospect,
    prospectScore: breakdown.total,
    priority,
    siteScore: null,    // Sera enrichi par Playwright (audit technique)
    issues,
  }
}

/**
 * Score un tableau de prospects et les trie du plus intéressant au moins.
 */
export function scoreAndSort(prospects: OverpassProspect[]): ScoredProspect[] {
  return prospects
    .map(buildScoredProspect)
    .sort((a, b) => b.prospectScore - a.prospectScore)
}
