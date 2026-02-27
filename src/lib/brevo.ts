// ── Envoi d'emails transactionnels via Brevo API ─────────────────────────────
// SERVER-ONLY — Ne jamais importer côté client.
// Doc API : https://developers.brevo.com/reference/sendtransacemail

export type BrevoSendParams = {
  to: { email: string; name?: string }
  subject: string
  htmlContent: string
  textContent: string
  fromEmail: string
  fromName: string
  prospectId?: string
  apiKey: string
}

export type BrevoSendResult = {
  messageId: string
}

// ── Convertit du texte plain en HTML minimal ─────────────────────────────────

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Double newlines → paragraphs, single newlines → line breaks
  const withParagraphs = escaped
    .split(/\n\n+/)
    .map(para => `<p style="margin: 0 0 14px 0;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #333333; max-width: 600px;">${withParagraphs}</div>`
}

// ── sendBrevoEmail ────────────────────────────────────────────────────────────

export async function sendBrevoEmail(params: BrevoSendParams): Promise<BrevoSendResult> {
  const { to, subject, htmlContent, textContent, fromEmail, fromName, prospectId, apiKey } = params

  const payload: Record<string, unknown> = {
    sender:      { name: fromName, email: fromEmail },
    to:          [{ email: to.email, name: to.name ?? to.email }],
    subject,
    htmlContent,
    textContent,
  }

  // Tag pour relier dans le dashboard Brevo
  if (prospectId) {
    payload.tags = [`prospect-${prospectId}`]
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { message?: string; code?: string }
    throw new Error(errBody.message ?? `Brevo HTTP ${res.status}`)
  }

  const data = await res.json() as { messageId?: string }
  return { messageId: data.messageId ?? `brevo-${Date.now()}` }
}
