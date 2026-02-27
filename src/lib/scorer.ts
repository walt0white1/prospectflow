// ── Algorithme de scoring prospect post-audit ─────────────────────────────────
// Calcule le score de prospection (0-100) et le score de qualité du site.
// Plus le score prospect est élevé, plus l'entreprise est à cibler.

import type { AuditResult } from './scraper'

export type ProspectPriority = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'COLD'

export type ScoringResult = {
  prospectScore: number    // 0–100, élevé = intéressant à prospecter
  siteScore: number        // 0–100, élevé = bon site web
  priority: ProspectPriority
  breakdown: ScoringBreakdown
}

export type ScoringBreakdown = {
  base: number
  performance: number
  security: number
  mobile: number
  seo: number
  designAge: number
  obsoleteTech: number
  cheapCMS: number
  criticalIssues: number
  googleRating: number
}

// ── Prospect score (0-100, higher = more interesting to prospect) ─────────────

export function computeProspectScore(opts: {
  hasWebsite: boolean
  audit?: AuditResult | null
  googleRating?: number | null
}): ScoringResult {
  const { hasWebsite, audit, googleRating } = opts

  // Pas de site web → opportunité maximale
  if (!hasWebsite) {
    const score = 85 + Math.floor(Math.random() * 10) // 85-94
    return {
      prospectScore: score,
      siteScore: 0,
      priority: 'HOT',
      breakdown: {
        base: 50, performance: 0, security: 0, mobile: 0, seo: 0,
        designAge: 0, obsoleteTech: 0, cheapCMS: 0,
        criticalIssues: 0, googleRating: 0,
      },
    }
  }

  // Site existe mais pas encore audité
  if (!audit) {
    return {
      prospectScore: 50,
      siteScore: 50,
      priority: 'MEDIUM',
      breakdown: {
        base: 50, performance: 0, security: 0, mobile: 0, seo: 0,
        designAge: 0, obsoleteTech: 0, cheapCMS: 0,
        criticalIssues: 0, googleRating: 0,
      },
    }
  }

  let score = 50
  const breakdown: ScoringBreakdown = {
    base: 50, performance: 0, security: 0, mobile: 0,
    seo: 0, designAge: 0, obsoleteTech: 0, cheapCMS: 0,
    criticalIssues: 0, googleRating: 0,
  }

  // ── Performance (+5 à +20 selon le temps de chargement) ───────────────────
  if (audit.loadTimeSec > 8) {
    breakdown.performance = 20
  } else if (audit.loadTimeSec > 5) {
    breakdown.performance = 15
  } else if (audit.loadTimeSec > 3) {
    breakdown.performance = 5
  } else {
    breakdown.performance = -5  // Site rapide = moins intéressant
  }
  score += breakdown.performance

  // ── Sécurité (+15 si pas de SSL) ──────────────────────────────────────────
  if (!audit.hasSSL) {
    breakdown.security = 15
    score += 15
  }

  // ── Mobile (+10 à +20 si pas responsive) ─────────────────────────────────
  if (!audit.isResponsive || !audit.hasViewportMeta) {
    breakdown.mobile = 20
    score += 20
  } else if (audit.mobileScore < 50) {
    breakdown.mobile = 10
    score += 10
  }

  // ── SEO (+8 à +15 si mauvais score SEO) ──────────────────────────────────
  if (audit.seoScore < 40) {
    breakdown.seo = 15
    score += 15
  } else if (audit.seoScore < 60) {
    breakdown.seo = 8
    score += 8
  }

  // ── Design daté (+8 à +15 selon l'année estimée) ─────────────────────────
  if (audit.designAge) {
    if (audit.designAge < 2015) {
      breakdown.designAge = 15
      score += 15
    } else if (audit.designAge < 2018) {
      breakdown.designAge = 8
      score += 8
    }
  }

  // ── Technologies obsolètes (+10) ─────────────────────────────────────────
  const OBSOLETE = ['Flash', 'Tables-layout', 'Frames']
  if (audit.techStack.some(t => OBSOLETE.includes(t))) {
    breakdown.obsoleteTech = 10
    score += 10
  }

  // ── CMS basique (+5 si Wix, Jimdo, Weebly) ───────────────────────────────
  const CHEAP_CMS = ['Wix', 'Jimdo', 'Weebly', 'Webnode', 'e-monsite', 'Google Sites']
  if (audit.cms && CHEAP_CMS.includes(audit.cms)) {
    breakdown.cheapCMS = 5
    score += 5
  }

  // ── Problèmes critiques (+5 par issue critique) ───────────────────────────
  const criticalCount = audit.issues.filter(i => i.severity === 'high').length
  breakdown.criticalIssues = criticalCount * 5
  score += breakdown.criticalIssues

  // ── Note Google < 3.5 (+8 — prospect motivé à améliorer son image) ────────
  if (googleRating && googleRating < 3.5) {
    breakdown.googleRating = 8
    score += 8
  }

  const prospectScore = Math.max(0, Math.min(100, Math.round(score)))
  const siteScore = computeSiteScore(audit)
  const priority = scoreToProspectPriority(prospectScore)

  return { prospectScore, siteScore, priority, breakdown }
}

// ── Site quality score (0-100, higher = better site) ─────────────────────────

export function computeSiteScore(audit: AuditResult): number {
  let score = 100

  // Performance
  if (audit.loadTimeSec > 8)       score -= 35
  else if (audit.loadTimeSec > 5)  score -= 25
  else if (audit.loadTimeSec > 3)  score -= 12

  // SSL
  if (!audit.hasSSL) score -= 25

  // Mobile
  if (!audit.isResponsive) score -= 20
  else if (audit.mobileScore < 50) score -= 10

  // SEO (pondération légère)
  score -= Math.round((100 - audit.seoScore) * 0.15)

  // Design daté
  if (audit.designAge && audit.designAge < 2015) score -= 15
  else if (audit.designAge && audit.designAge < 2018) score -= 8

  // Flash/Tables
  if (audit.techStack.includes('Flash')) score -= 20
  if (audit.techStack.includes('Tables-layout')) score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ── Priority mapper ───────────────────────────────────────────────────────────

export function scoreToProspectPriority(score: number): ProspectPriority {
  if (score >= 80) return 'HOT'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  if (score >= 20) return 'LOW'
  return 'COLD'
}
