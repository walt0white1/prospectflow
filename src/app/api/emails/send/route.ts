// ── POST /api/emails/send ─────────────────────────────────────────────────────
// Envoie un email via Brevo API et persiste en base de données.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendBrevoEmail, textToHtml } from '@/lib/brevo'
import { buildProspectDetail } from '@/lib/mock-prospect-detail'

const BodySchema = z.object({
  prospectId:     z.string(),
  subject:        z.string().min(1),
  body:           z.string().min(1),
  recipientEmail: z.string().email().optional(),
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

  const { prospectId, subject, body: emailBody, recipientEmail } = body

  // ── Get prospect ───────────────────────────────────────────────────────────
  let prospect: {
    companyName: string
    email?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null = null

  try {
    prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { companyName: true, email: true, firstName: true, lastName: true },
    })
  } catch { /* DB non disponible */ }

  if (!prospect) {
    const detail = buildProspectDetail(prospectId)
    if (detail) {
      prospect = {
        companyName: detail.companyName,
        email:       detail.email,
        firstName:   detail.firstName,
        lastName:    detail.lastName,
      }
    }
  }

  if (!prospect) {
    return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
  }

  const toEmail = recipientEmail ?? prospect.email
  if (!toEmail) {
    return NextResponse.json(
      { error: 'Aucune adresse email pour ce prospect. Ajoutez-en une dans sa fiche.' },
      { status: 422 },
    )
  }

  // ── Get settings (Brevo + expéditeur + limites) ───────────────────────────
  const session = await getServerSession(authOptions)
  let brevoApiKey: string | null = process.env.BREVO_API_KEY ?? null
  let fromEmail:   string | null = process.env.BREVO_FROM_EMAIL ?? null
  let fromName = 'ProspectFlow'
  let dailyEmailLimit = Number(process.env.DAILY_EMAIL_LIMIT ?? 50)
  let delayBetweenSecs = 30

  try {
    const user = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id }, include: { settings: true } })
      : null
    if (user) {
      if (user.settings?.brevoApiKey)    brevoApiKey      = user.settings.brevoApiKey
      if (user.settings?.brevoFromEmail) fromEmail        = user.settings.brevoFromEmail
      if (user.settings?.brevoFromName)  fromName         = user.settings.brevoFromName
      else if (user.name)                fromName         = user.name
      if (user.settings?.dailyEmailLimit)   dailyEmailLimit   = user.settings.dailyEmailLimit
      if (user.settings?.delayBetweenEmails) delayBetweenSecs = user.settings.delayBetweenEmails
    }
  } catch { /* DB non disponible */ }

  if (!brevoApiKey || !fromEmail) {
    return NextResponse.json(
      { error: 'Brevo non configuré. Ajoutez votre clé API et email expéditeur dans Paramètres → Email.' },
      { status: 503 },
    )
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const sentToday = await prisma.email.count({
      where: { sentAt: { gte: startOfDay }, status: { not: 'DRAFT' } },
    })
    if (sentToday >= dailyEmailLimit) {
      return NextResponse.json(
        { error: `Limite journalière atteinte (${dailyEmailLimit} emails/jour). Réessayez demain.` },
        { status: 429 },
      )
    }
    if (delayBetweenSecs > 0) {
      const lastEmail = await prisma.email.findFirst({
        where:   { sentAt: { not: null } },
        orderBy: { sentAt: 'desc' },
        select:  { sentAt: true },
      })
      if (lastEmail?.sentAt) {
        const elapsedSec = (Date.now() - lastEmail.sentAt.getTime()) / 1000
        if (elapsedSec < delayBetweenSecs) {
          const waitSec = Math.ceil(delayBetweenSecs - elapsedSec)
          return NextResponse.json(
            { error: `Patientez ${waitSec}s avant le prochain envoi (délai anti-spam).`, retryAfter: waitSec },
            { status: 429, headers: { 'Retry-After': String(waitSec) } },
          )
        }
      }
    }
  } catch { /* DB non disponible — envoi sans rate limit */ }

  // ── Send via Brevo ─────────────────────────────────────────────────────────
  const recipientName = [prospect.firstName, prospect.lastName].filter(Boolean).join(' ')
    || prospect.companyName

  let messageId: string
  try {
    const result = await sendBrevoEmail({
      to:          { email: toEmail, name: recipientName },
      subject,
      htmlContent: textToHtml(emailBody),
      textContent: emailBody,
      fromEmail,
      fromName,
      prospectId,
      apiKey:      brevoApiKey,
    })
    messageId = result.messageId
  } catch (err) {
    console.error('[emails/send] Brevo error:', err)
    return NextResponse.json(
      { error: `Envoi échoué : ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }

  // ── Save to DB ─────────────────────────────────────────────────────────────
  let emailId: string | undefined
  try {
    const saved = await prisma.email.create({
      data: {
        prospectId,
        subject,
        body:      emailBody,
        bodyHtml:  textToHtml(emailBody),
        status:    'SENT',
        sentAt:    new Date(),
        brevoMsgId: messageId,
      },
    })
    emailId = saved.id

    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status:        'CONTACTED',
        lastContactAt: new Date(),
        lastEmailAt:   new Date(),
        emailsSent:    { increment: 1 },
      },
    })
  } catch { /* DB non disponible — l'email a quand même été envoyé */ }

  return NextResponse.json({ success: true, messageId, emailId, toEmail })
}
