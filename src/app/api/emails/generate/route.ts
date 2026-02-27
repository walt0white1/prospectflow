// ── POST /api/emails/generate ─────────────────────────────────────────────────
// Génère un email de prospection personnalisé via Anthropic Claude.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateProspectEmail, type EmailType, type EmailTone } from '@/lib/anthropic'
import { buildProspectDetail } from '@/lib/mock-prospect-detail'
import type { AuditResult } from '@/lib/scraper'

const BodySchema = z.object({
  prospectId:         z.string(),
  emailType:          z.enum(['premier_contact', 'relance_1', 'relance_2', 'relance_3', 'audit_gratuit']),
  tone:               z.enum(['professional', 'friendly', 'direct']),
  customInstructions: z.string().optional(),
  auditData:          z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.issues.map((e: { message: string }) => e.message).join(', ')
      : 'Corps de requête invalide'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { prospectId, emailType, tone, customInstructions, auditData } = body

  // ── Get prospect (DB ou fallback mock) ─────────────────────────────────────
  let prospect: {
    companyName: string
    industry: string
    city: string
    firstName?: string | null
    lastName?: string | null
    website?: string | null
    hasWebsite: boolean
    googleRating?: number | null
    googleReviewCount?: number | null
  } | null = null

  try {
    prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      select: {
        companyName: true, industry: true, city: true,
        firstName: true, lastName: true,
        website: true, hasWebsite: true,
        googleRating: true, googleReviewCount: true,
      },
    })
  } catch { /* DB non disponible */ }

  if (!prospect) {
    const detail = buildProspectDetail(prospectId)
    if (detail) {
      prospect = {
        companyName:        detail.companyName,
        industry:           detail.industry,
        city:               detail.city,
        firstName:          detail.firstName,
        lastName:           detail.lastName,
        website:            detail.website,
        hasWebsite:         detail.hasWebsite,
        googleRating:       detail.googleRating,
        googleReviewCount:  detail.googleReviewCount,
      }
    }
  }

  if (!prospect) {
    return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
  }

  // ── Get settings (anthropic key + expéditeur) ──────────────────────────────
  const session = await getServerSession(authOptions)
  let anthropicKey: string | null = process.env.ANTHROPIC_API_KEY ?? null
  let userName: string | null = null
  let userCompany: string | null = null
  let userPhone: string | null = null

  try {
    const user = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id }, include: { settings: true } })
      : null
    if (user) {
      if (user.settings?.anthropicKey) anthropicKey = user.settings.anthropicKey
      userName    = user.name    ?? null
      userCompany = user.company ?? null
      userPhone   = user.phone   ?? null
    }
  } catch { /* DB non disponible */ }

  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'Clé API Anthropic non configurée. Ajoutez-la dans Paramètres → IA.' },
      { status: 503 },
    )
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  try {
    const email = await generateProspectEmail({
      ...prospect,
      audit:              (auditData as AuditResult | undefined) ?? null,
      emailType:          emailType as EmailType,
      tone:               tone as EmailTone,
      customInstructions,
      userName,
      userCompany,
      userPhone,
      anthropicKey,
    })
    return NextResponse.json(email)
  } catch (err) {
    console.error('[emails/generate]', err)
    return NextResponse.json(
      { error: `Génération échouée : ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}
