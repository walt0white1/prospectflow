// ── POST /api/emails/webhook ───────────────────────────────────────────────
// Reçoit les événements Brevo (opened, clicked, bounce, unsubscribed).
// Sécurisé par BREVO_WEBHOOK_SECRET en query param.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmailStatus, ProspectStatus } from '@/generated/prisma/enums'

// Événements Brevo transmis par webhook
type BrevoEvent =
  | 'opened'
  | 'clicks'
  | 'delivered'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'unsubscribed'
  | 'spam'
  | 'invalid_email'
  | 'deferred'
  | 'blocked'

interface BrevoWebhookPayload {
  event:     BrevoEvent
  email:     string
  date:      string
  messageId?: string
  // Brevo envoie "message-id" avec tiret dans certains payloads
  'message-id'?: string
  subject?:  string
  tag?:      string   // ex : "prospect-abc123"
  link?:     string   // pour l'événement clicks
}

// Correspondance événement Brevo → statut Email Prisma
const EVENT_TO_STATUS: Partial<Record<BrevoEvent, EmailStatus>> = {
  delivered:    EmailStatus.SENT,
  opened:       EmailStatus.OPENED,
  clicks:       EmailStatus.CLICKED,
  soft_bounce:  EmailStatus.BOUNCED,
  hard_bounce:  EmailStatus.BOUNCED,
  spam:         EmailStatus.FAILED,
  blocked:      EmailStatus.FAILED,
  invalid_email:EmailStatus.FAILED,
  // unsubscribed : pas de statut email dédié, on gère uniquement le prospect
}

export async function POST(req: NextRequest) {
  // ── Vérification du secret ────────────────────────────────────────────────
  const webhookSecret = process.env.BREVO_WEBHOOK_SECRET
  if (webhookSecret) {
    const secret = req.nextUrl.searchParams.get('secret')
    if (secret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: BrevoWebhookPayload
  try {
    payload = await req.json() as BrevoWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, email: recipientEmail, messageId, tag } = payload
  const resolvedMessageId = messageId ?? payload['message-id']

  console.log(`[webhook] event=${event} email=${recipientEmail} msgId=${resolvedMessageId ?? 'n/a'} tag=${tag ?? 'n/a'}`)

  // ── Identifier l'email en base ────────────────────────────────────────────
  let emailRecord: { id: string; prospectId: string } | null = null

  try {
    if (resolvedMessageId) {
      emailRecord = await prisma.email.findFirst({
        where:  { brevoMsgId: resolvedMessageId },
        select: { id: true, prospectId: true },
      })
    }

    // Fallback : chercher via le tag "prospect-{id}" + email du destinataire
    if (!emailRecord && tag?.startsWith('prospect-')) {
      const prospectId = tag.replace('prospect-', '')
      emailRecord = await prisma.email.findFirst({
        where:   { prospectId, status: { notIn: ['DRAFT'] } },
        orderBy: { sentAt: 'desc' },
        select:  { id: true, prospectId: true },
      })
    }
  } catch (err) {
    console.warn('[webhook] DB lookup skipped:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: true, note: 'DB unavailable' })
  }

  if (!emailRecord) {
    // Email introuvable — on répond 200 pour éviter les retentatives Brevo
    console.warn(`[webhook] Email introuvable pour msgId=${resolvedMessageId}`)
    return NextResponse.json({ ok: true, note: 'email not found' })
  }

  const newStatus = EVENT_TO_STATUS[event]

  try {
    // ── Mise à jour du statut email ──────────────────────────────────────────
    if (newStatus) {
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status:   newStatus,
          ...(event === 'opened' ? { openedAt:  new Date() } : {}),
          ...(event === 'clicks' ? { clickedAt: new Date() } : {}),
        },
      })
    }

    // ── Désabonnement / spam (RGPD) — blacklister le prospect ───────────────
    if (event === 'unsubscribed' || event === 'spam') {
      await prisma.prospect.update({
        where: { id: emailRecord.prospectId },
        data:  { status: ProspectStatus.BLACKLIST },
      })
      console.log(`[webhook] Prospect ${emailRecord.prospectId} blacklisté (${event})`)
    }

    // ── Hard bounce / invalid — blacklister également ────────────────────────
    if (event === 'hard_bounce' || event === 'invalid_email') {
      await prisma.prospect.update({
        where: { id: emailRecord.prospectId },
        data:  { status: ProspectStatus.BLACKLIST },
      })
    }
  } catch (err) {
    console.error('[webhook] DB update failed:', err instanceof Error ? err.message : err)
    // On répond 500 pour que Brevo retente
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, processed: event })
}
