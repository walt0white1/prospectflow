'use client'

import { useState, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Sparkles, Send, Copy, RefreshCw, Loader2, ChevronLeft,
  Mail, CheckCircle2, AlertCircle, User, Building2,
} from 'lucide-react'
import type { EmailType, EmailTone } from '@/lib/anthropic'
import { EMAIL_TYPE_LABELS, EMAIL_TYPE_DESC } from '@/lib/anthropic'
import type { AuditResult } from '@/lib/scraper'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SentEmailSummary = {
  id: string
  subject: string
  preview: string
  sentAt: string
  status: 'SENT'
  openedAt: null
  clickedAt: null
  repliedAt: null
}

type Step = 'form' | 'preview'

// ── Props ─────────────────────────────────────────────────────────────────────

export type EmailComposerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospectId: string
  prospectName: string
  prospectEmail: string | null
  auditData: AuditResult | null
  onEmailSent?: (email: SentEmailSummary) => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TONES: { value: EmailTone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professionnel', desc: 'Chaleureux et crédible' },
  { value: 'friendly',     label: 'Amical',        desc: 'Détendu et accessible' },
  { value: 'direct',       label: 'Direct',         desc: 'Concis et factuel' },
]

const EMAIL_TYPES = Object.entries(EMAIL_TYPE_LABELS) as [EmailType, string][]

// ── Main component ────────────────────────────────────────────────────────────

export function EmailComposer({
  open, onOpenChange,
  prospectId, prospectName, prospectEmail,
  auditData, onEmailSent,
}: EmailComposerProps) {
  // Form state
  const [step,               setStep]               = useState<Step>('form')
  const [emailType,          setEmailType]          = useState<EmailType>('premier_contact')
  const [tone,               setTone]               = useState<EmailTone>('professional')
  const [customInstructions, setCustomInstructions] = useState('')

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody,    setDraftBody]    = useState('')

  // Send state
  const [isSending,       setIsSending]       = useState(false)
  const [customRecipient, setCustomRecipient] = useState(prospectEmail ?? '')
  const [showRecipient,   setShowRecipient]   = useState(!prospectEmail)

  // ── Reset on close ───────────────────────────────────────────────────────
  function handleOpenChange(v: boolean) {
    if (!v) {
      setStep('form')
      setEmailType('premier_contact')
      setTone('professional')
      setCustomInstructions('')
      setDraftSubject('')
      setDraftBody('')
      setIsSending(false)
      setShowRecipient(!prospectEmail)
      setCustomRecipient(prospectEmail ?? '')
    }
    onOpenChange(v)
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/emails/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          emailType,
          tone,
          customInstructions: customInstructions.trim() || undefined,
          auditData: auditData ?? undefined,
        }),
      })
      const json = await res.json() as { subject?: string; body?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur inconnue')

      setDraftSubject(json.subject ?? '')
      setDraftBody(json.body ?? '')
      setStep('preview')
    } catch (err) {
      toast.error('Génération échouée', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsGenerating(false)
    }
  }, [prospectId, emailType, tone, customInstructions, auditData])

  // ── Regenerate ────────────────────────────────────────────────────────────
  async function regenerate() {
    setDraftSubject('')
    setDraftBody('')
    await generate()
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  function copyEmail() {
    const text = `Objet : ${draftSubject}\n\n${draftBody}`
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Email copié dans le presse-papier')
    }).catch(() => {
      toast.error('Impossible de copier')
    })
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  async function sendEmail() {
    const toEmail = customRecipient.trim() || prospectEmail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!toEmail) {
      toast.error('Entrez une adresse email destinataire')
      setShowRecipient(true)
      return
    }
    if (!emailRegex.test(toEmail)) {
      toast.error('Adresse email invalide')
      setShowRecipient(true)
      return
    }

    setIsSending(true)
    const toastId = toast.loading('Envoi en cours…')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          subject: draftSubject,
          body:    draftBody,
          recipientEmail: toEmail !== prospectEmail ? toEmail : undefined,
        }),
      })
      const json = await res.json() as { success?: boolean; error?: string; emailId?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur inconnue')

      toast.success('Email envoyé !', {
        id: toastId,
        description: `→ ${toEmail}`,
      })

      // Notify parent to add email to timeline
      onEmailSent?.({
        id:       json.emailId ?? `local-${Date.now()}`,
        subject:  draftSubject,
        preview:  draftBody.slice(0, 120).replace(/\n/g, ' '),
        sentAt:   new Date().toISOString(),
        status:   'SENT',
        openedAt: null, clickedAt: null, repliedAt: null,
      })

      handleOpenChange(false)
    } catch (err) {
      toast.error('Envoi échoué', {
        id: toastId,
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSending(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl w-full p-0 gap-0 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-card/30">
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 flex-shrink-0 -ml-1"
                onClick={() => setStep('form')}
                disabled={isGenerating}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">
                {step === 'form' ? 'Générer un email IA' : 'Email généré'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{prospectName}</span>
                {auditData && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-indigo-400 border-indigo-400/30 bg-indigo-400/10">
                    Audit inclus
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ── Form Step ───────────────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="px-6 py-5 space-y-5">

            {/* Email type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Type d'email
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {EMAIL_TYPES.map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setEmailType(type)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                      emailType === type
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-foreground'
                        : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-[11px] opacity-60 text-right max-w-[200px] leading-tight">
                      {EMAIL_TYPE_DESC[type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tone */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ton de l'email
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-all ${
                      tone === t.value
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-foreground'
                        : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Instructions personnalisées
                <span className="ml-1 font-normal normal-case opacity-60">(optionnel)</span>
              </Label>
              <Textarea
                placeholder="Ex : Mentionner notre offre de lancement à 990€, insister sur le délai rapide (2 semaines), proposer un appel jeudi…"
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                className="min-h-[72px] resize-none text-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-500"
                onClick={generate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Sparkles className="w-4 h-4" />
                }
                {isGenerating ? 'Génération…' : 'Générer avec l\'IA'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Preview Step ─────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="px-6 py-5 space-y-4">

            {/* Loading overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Régénération en cours…</p>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Objet
              </Label>
              <Input
                value={draftSubject}
                onChange={e => setDraftSubject(e.target.value)}
                className="text-sm font-medium"
                placeholder="Objet de l'email…"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Corps de l'email
                <span className="ml-2 font-normal normal-case text-indigo-400 text-[10px]">
                  ✎ Éditable directement
                </span>
              </Label>
              <Textarea
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                className="min-h-[220px] resize-none text-sm leading-relaxed font-mono"
                placeholder="Corps de l'email…"
              />
            </div>

            <Separator />

            {/* Recipient */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3 h-3" />Destinataire
                </Label>
                {prospectEmail && (
                  <button
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() => setShowRecipient(v => !v)}
                  >
                    {showRecipient ? 'Utiliser email du prospect' : 'Modifier'}
                  </button>
                )}
              </div>

              {!prospectEmail || showRecipient ? (
                <Input
                  type="email"
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  placeholder="email@exemple.fr"
                  className="text-sm h-9"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 h-9 rounded-md border bg-card/40 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{prospectEmail}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                </div>
              )}

              {!prospectEmail && !customRecipient.trim() && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Ce prospect n'a pas d'email — entrez une adresse manuellement pour envoyer.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                variant="outline" size="sm"
                className="gap-2 h-8"
                onClick={regenerate}
                disabled={isGenerating || isSending}
              >
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                Régénérer
              </Button>

              <Button
                variant="outline" size="sm"
                className="gap-2 h-8"
                onClick={copyEmail}
                disabled={isGenerating || isSending}
              >
                <Copy className="w-3.5 h-3.5" />Copier
              </Button>

              <div className="flex-1" />

              <Button
                size="sm"
                className="gap-2 h-8 bg-indigo-600 hover:bg-indigo-500"
                onClick={sendEmail}
                disabled={
                  isGenerating || isSending
                  || !draftSubject.trim() || !draftBody.trim()
                  || (!prospectEmail && !customRecipient.trim())
                }
              >
                {isSending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
                {isSending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
