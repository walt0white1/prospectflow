// ── Client Anthropic + génération d'emails de prospection ────────────────────
// SERVER-ONLY — Ne jamais importer côté client.

import Anthropic from '@anthropic-ai/sdk'
import type { AuditResult } from './scraper'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmailType =
  | 'premier_contact'
  | 'relance_1'
  | 'relance_2'
  | 'relance_3'
  | 'audit_gratuit'

export type EmailTone = 'professional' | 'friendly' | 'direct'

export type EmailGenerationParams = {
  // Prospect
  companyName: string
  industry: string
  city: string
  firstName?: string | null
  lastName?: string | null
  website?: string | null
  hasWebsite: boolean
  googleRating?: number | null
  googleReviewCount?: number | null
  // Audit (si disponible)
  audit?: AuditResult | null
  // Paramètres de l'email
  emailType: EmailType
  tone: EmailTone
  customInstructions?: string
  // Expéditeur
  userName?: string | null
  userCompany?: string | null
  userPhone?: string | null
  // Clé API
  anthropicKey?: string | null
}

export type GeneratedEmail = {
  subject: string
  body: string
}

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  premier_contact: '1er contact',
  relance_1: 'Relance 1',
  relance_2: 'Relance 2',
  relance_3: 'Relance 3',
  audit_gratuit: 'Audit gratuit offert',
}

export const EMAIL_TYPE_DESC: Record<EmailType, string> = {
  premier_contact: 'Première prise de contact, présentation de vos services',
  relance_1: 'Relance douce après 3-5 jours sans réponse',
  relance_2: 'Deuxième relance, ajout d\'une valeur supplémentaire',
  relance_3: 'Dernier contact avant clôture du dossier',
  audit_gratuit: 'Proposition d\'un audit gratuit de leur site web',
}

// ── System prompt (depuis la spec) ───────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en prospection commerciale B2B en France, spécialisé dans la vente de services de création et refonte de sites internet.

Tu génères des emails de prospection qui :
- Sont personnalisés avec des données RÉELLES du prospect (problèmes détectés, scores, note Google, etc.)
- Ne ressemblent PAS à du spam ou du marketing générique
- Sont courts (max 150-200 mots pour le body)
- Ont un objet accrocheur et spécifique (pas générique)
- Incluent UNE seule proposition de valeur claire
- Se terminent par UN seul call-to-action simple
- Ne sont JAMAIS agressifs ou insistants
- Mentionnent des données concrètes (temps de chargement, score mobile, note Google si pertinente)
- NE mentionnent JAMAIS "audité" ou "analysé" leur site → formuler "en visitant votre site" ou "j'ai remarqué que"
- NE mentionnent JAMAIS la note Google de manière blessante

IMPORTANT :
- L'email doit sembler écrit à la main par un humain
- Pas de formules bateau type "Dans un monde de plus en plus digital..."
- Pas de bullet points dans l'email
- Signe avec le nom et téléphone fournis`

// ── Build user prompt ─────────────────────────────────────────────────────────

function buildUserPrompt(params: EmailGenerationParams): string {
  const {
    companyName, industry, city, firstName, lastName,
    website, hasWebsite, googleRating, googleReviewCount,
    audit, emailType, tone, customInstructions,
    userName, userCompany, userPhone,
  } = params

  let prompt = `Génère un email de prospection pour ce prospect :

ENTREPRISE : ${companyName}
SECTEUR : ${industry}
VILLE : ${city}
CONTACT : ${[firstName, lastName].filter(Boolean).join(' ') || 'Gérant(e)'}
`

  if (googleRating) {
    prompt += `NOTE GOOGLE : ${googleRating}/5 (${googleReviewCount ?? 0} avis)\n`
  }

  if (hasWebsite && audit) {
    prompt += `
SITE WEB : ${website}
TEMPS DE CHARGEMENT : ${audit.loadTimeSec.toFixed(1)}s
SCORE MOBILE : ${audit.mobileScore}/100
SCORE SEO : ${audit.seoScore}/100
SSL : ${audit.hasSSL ? 'Oui' : 'Non'}
RESPONSIVE : ${audit.isResponsive ? 'Oui' : 'Non'}
TECHNOLOGIES : ${audit.techStack.join(', ') || 'inconnues'}
DESIGN ESTIMÉ : ${audit.designAge ?? 'inconnu'}

PROBLÈMES DÉTECTÉS :
${audit.issues.length > 0
  ? audit.issues.map(i => `- [${i.severity}] ${i.label}${i.description ? ` : ${i.description}` : ''}`).join('\n')
  : '- Aucun problème critique'}
`
  } else if (hasWebsite && !audit) {
    prompt += `\nSITE WEB : ${website} (non encore analysé en détail)\n`
  } else {
    prompt += `\nPAS DE SITE WEB — opportunité de création from scratch\n`
  }

  const toneLabel =
    tone === 'professional' ? 'Professionnel mais chaleureux'
    : tone === 'friendly'   ? 'Amical et décontracté'
    : 'Direct et factuel'

  prompt += `
TYPE D'EMAIL : ${EMAIL_TYPE_LABELS[emailType]}
TON : ${toneLabel}

EXPÉDITEUR :
Nom : ${userName || 'Votre prénom'}
Entreprise : ${userCompany || ''}
Téléphone : ${userPhone || ''}
`

  if (customInstructions?.trim()) {
    prompt += `\nINSTRUCTIONS SPÉCIFIQUES : ${customInstructions.trim()}\n`
  }

  prompt += `
Réponds EXACTEMENT dans ce format :
OBJET: [objet de l'email]
---
[corps de l'email]`

  return prompt
}

// ── generateProspectEmail ─────────────────────────────────────────────────────

export async function generateProspectEmail(
  params: EmailGenerationParams,
): Promise<GeneratedEmail> {
  const client = new Anthropic({
    apiKey: params.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? '',
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(params) }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Réponse inattendue du modèle')

  const text = content.text.trim()

  // Parse "OBJET: ...\n---\n..." format
  const separatorIndex = text.indexOf('\n---\n')
  if (separatorIndex !== -1) {
    const subjectPart = text.slice(0, separatorIndex).replace(/^OBJET:\s*/i, '').trim()
    const bodyPart    = text.slice(separatorIndex + 5).trim()
    if (subjectPart && bodyPart) return { subject: subjectPart, body: bodyPart }
  }

  // Fallback: parse line by line
  const lines = text.split('\n')
  const subjectLine = lines.find(l => /^OBJET\s*:/i.test(l))
  if (!subjectLine) throw new Error('Format de réponse invalide — pas de ligne OBJET:')

  const subject = subjectLine.replace(/^OBJET\s*:\s*/i, '').trim()
  const bodyLines = lines.slice(lines.indexOf(subjectLine) + 1).filter(l => l !== '---')
  const body = bodyLines.join('\n').trim()

  if (!subject || !body) throw new Error('Email incomplet généré par le modèle')
  return { subject, body }
}
