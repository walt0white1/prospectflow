'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Globe, ExternalLink, Building2,
  AlertCircle, AlertTriangle, Info, RefreshCw, MessageSquare, StickyNote,
  Plus, Clock, Calendar, Ban, Send, CheckCircle2, Layers, Eye, Loader2,
  Lock, LockOpen, Smartphone, Gauge,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ScoreCircle } from '@/components/prospects/ScoreCircle'
import { toast } from 'sonner'
import type {
  ProspectDetail, MockEmail, MockNote, MockAudit,
} from '@/lib/mock-prospect-detail'
import type { AuditResult } from '@/lib/scraper'
import { EmailComposer, type SentEmailSummary } from '@/components/emails/EmailComposer'

// Union : MockAudit (données statiques) | AuditResult (données Playwright temps réel)
type AuditData = MockAudit | AuditResult

function isFullAudit(a: AuditData): a is AuditResult {
  return 'hasSSL' in a
}

// ── Config maps ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; bg: string }> = {
  NEW:       { label: 'Nouveau',     cls: 'text-slate-400',   bg: 'bg-slate-400/10 border-slate-400/30' },
  AUDITED:   { label: 'Audité',      cls: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/30' },
  CONTACTED: { label: 'Contacté',    cls: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/30' },
  OPENED:    { label: 'Ouvert',      cls: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/30' },
  REPLIED:   { label: 'Répondu',     cls: 'text-green-400',   bg: 'bg-green-400/10 border-green-400/30' },
  MEETING:   { label: 'RDV',         cls: 'text-indigo-400',  bg: 'bg-indigo-400/10 border-indigo-400/30' },
  PROPOSAL:  { label: 'Proposition', cls: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/30' },
  WON:       { label: 'Gagné ✓',    cls: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  LOST:      { label: 'Perdu',       cls: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/30' },
  BLACKLIST: { label: 'Blacklist',   cls: 'text-red-600',     bg: 'bg-red-600/10 border-red-600/30' },
}

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  HOT:    { label: '🔥 HOT',   cls: 'text-red-400' },
  HIGH:   { label: '▲ Haute',  cls: 'text-orange-400' },
  MEDIUM: { label: '● Moyen',  cls: 'text-amber-400' },
  LOW:    { label: '▼ Bas',    cls: 'text-blue-400' },
  COLD:   { label: '❄ Froid', cls: 'text-slate-400' },
}

const SOURCE_CFG: Record<string, { label: string; cls: string }> = {
  OPENSTREETMAP: { label: 'OpenStreetMap', cls: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  GOOGLE_MAPS:   { label: 'Google Maps',   cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  MANUAL:        { label: 'Manuel',        cls: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  IMPORT_CSV:    { label: 'Import CSV',    cls: 'text-green-400 bg-green-400/10 border-green-400/20' },
}

const EMAIL_STATUS_CFG: Record<string, { label: string; badgeCls: string; dotCls: string }> = {
  SENT:    { label: 'Envoyé',   badgeCls: 'text-slate-400 bg-slate-400/10',   dotCls: 'bg-slate-500' },
  OPENED:  { label: 'Ouvert',   badgeCls: 'text-blue-400 bg-blue-400/10',     dotCls: 'bg-blue-400' },
  CLICKED: { label: 'Cliqué',   badgeCls: 'text-indigo-400 bg-indigo-400/10', dotCls: 'bg-indigo-400' },
  REPLIED: { label: 'Répondu',  badgeCls: 'text-green-400 bg-green-400/10',   dotCls: 'bg-green-400' },
  BOUNCED: { label: 'Erreur',   badgeCls: 'text-red-400 bg-red-400/10',       dotCls: 'bg-red-400' },
}

const SEVERITY_CFG = {
  high:   { label: 'Critique',  cls: 'text-red-400',   bg: 'bg-red-400/10',   icon: AlertCircle   as LucideIcon },
  medium: { label: 'Important', cls: 'text-amber-400', bg: 'bg-amber-400/10', icon: AlertTriangle as LucideIcon },
  low:    { label: 'Mineur',    cls: 'text-blue-400',  bg: 'bg-blue-400/10',  icon: Info          as LucideIcon },
}

const ALL_STATUSES = Object.keys(STATUS_CFG)

// ── Helpers ───────────────────────────────────────────────────────────────────

function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return "aujourd'hui"
  if (d === 1) return 'hier'
  if (d < 7)   return `il y a ${d}j`
  if (d < 30)  return `il y a ${Math.floor(d / 7)} sem.`
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`
  return `il y a ${Math.floor(d / 365)} an`
}

function absDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function scoreQual(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  if (score >= 20) return 'Faible'
  return 'Très faible'
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-red-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-amber-400'
  if (score >= 20) return 'text-indigo-400'
  return 'text-slate-400'
}

// ── Small components ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="flex flex-1">
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="w-72 border-l p-5 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Separator />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon, label, children,
}: {
  icon: LucideIcon; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-card border flex items-center justify-center mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border bg-card/50">
      <ScoreCircle score={score} size={72} />
      <div className="text-center w-full">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-bold mt-0.5 ${scoreColor(score)}`}>{scoreQual(score)}</p>
      </div>
      <Progress value={score} className="h-1.5 w-full" />
    </div>
  )
}

// ── Tab: Infos ────────────────────────────────────────────────────────────────

function InfosTab({ prospect }: { prospect: ProspectDetail }) {
  const source = SOURCE_CFG[prospect.source] ?? SOURCE_CFG.OPENSTREETMAP
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `${prospect.companyName} ${prospect.city}`,
  )}`

  return (
    <div className="space-y-8 max-w-xl">
      {/* Contact */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Contact
        </h3>
        <div className="space-y-3">
          {(prospect.firstName || prospect.lastName) && (
            <InfoRow icon={Building2} label="Interlocuteur">
              {[prospect.firstName, prospect.lastName].filter(Boolean).join(' ')}
            </InfoRow>
          )}
          {prospect.email ? (
            <InfoRow icon={Mail} label="Email">
              <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">
                {prospect.email}
              </a>
            </InfoRow>
          ) : (
            <InfoRow icon={Mail} label="Email">
              <span className="text-muted-foreground italic">Non renseigné</span>
            </InfoRow>
          )}
          {prospect.phone && (
            <InfoRow icon={Phone} label="Téléphone">
              <a href={`tel:${prospect.phone}`} className="hover:text-primary">
                {prospect.phone}
              </a>
            </InfoRow>
          )}
          <InfoRow icon={MapPin} label="Adresse">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{prospect.city}{prospect.postalCode && ` (${prospect.postalCode})`}</span>
              <a
                href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </InfoRow>
          {prospect.website ? (
            <InfoRow icon={Globe} label="Site web">
              <a
                href={prospect.website} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 55)}
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </InfoRow>
          ) : (
            <InfoRow icon={Globe} label="Site web">
              <span className="text-amber-400 font-medium">⚠ Aucun site web détecté</span>
            </InfoRow>
          )}
        </div>
      </section>

      <Separator />

      {/* Meta */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Informations
        </h3>
        <div className="space-y-3">
          <InfoRow icon={Layers} label="Source">
            <Badge variant="outline" className={`text-xs ${source.cls}`}>
              {source.label}
            </Badge>
          </InfoRow>
          {prospect.googleRating && (
            <InfoRow icon={Star} label="Note Google">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-amber-400 font-semibold">
                  ★ {prospect.googleRating.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({prospect.googleReviewCount} avis)
                </span>
              </span>
            </InfoRow>
          )}
          <InfoRow icon={Calendar} label="Ajouté le">
            {absDate(prospect.createdAt)}
          </InfoRow>
          {prospect.lastContactAt && (
            <InfoRow icon={Clock} label="Dernier contact">
              {absDate(prospect.lastContactAt)}
            </InfoRow>
          )}
          <InfoRow icon={CheckCircle2} label="Emails envoyés">
            {prospect.emailsSent > 0
              ? `${prospect.emailsSent} email${prospect.emailsSent > 1 ? 's' : ''}`
              : <span className="text-muted-foreground italic">Aucun</span>
            }
          </InfoRow>
        </div>
      </section>
    </div>
  )
}

// ── Tab: Audit ────────────────────────────────────────────────────────────────

function AuditTab({
  audit, prospect, isAuditing, onAudit,
}: {
  audit: AuditData | null
  prospect: ProspectDetail
  isAuditing: boolean
  onAudit: () => void
}) {
  if (!prospect.hasWebsite) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center">
          <Globe className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Aucun site web</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Ce prospect n'a pas de site web. C'est l'opportunité idéale pour lui proposer une présence en ligne !
          </p>
        </div>
        <Badge variant="outline" className="text-amber-400 bg-amber-400/10 border-amber-400/30 text-sm px-3 py-1">
          🔥 Score prospect maximum possible
        </Badge>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          {isAuditing
            ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
            : <RefreshCw className="w-8 h-8 text-muted-foreground" />
          }
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {isAuditing ? 'Audit en cours…' : 'Audit non effectué'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isAuditing
              ? 'Analyse du site avec Playwright (peut prendre 15-30s)…'
              : 'Lance un audit pour analyser mobile, SEO et performances.'
            }
          </p>
        </div>
        {!isAuditing && (
          <Button onClick={onAudit}>
            <RefreshCw className="w-4 h-4 mr-2" />Lancer l'audit
          </Button>
        )}
      </div>
    )
  }

  const highCount   = audit.issues.filter(i => i.severity === 'high').length
  const mediumCount = audit.issues.filter(i => i.severity === 'medium').length
  const lowCount    = audit.issues.filter(i => i.severity === 'low').length

  const sortedIssues = [...audit.issues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })

  // Extra metadata only available in full Playwright AuditResult
  const full = isFullAudit(audit) ? audit : null

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Indicateurs techniques (Playwright only) ─────────────────────────── */}
      {full && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Indicateurs techniques
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* SSL */}
            <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${
              full.hasSSL
                ? 'bg-green-400/10 border-green-400/20'
                : 'bg-red-400/10 border-red-400/20'
            }`}>
              {full.hasSSL
                ? <Lock className="w-5 h-5 text-green-400" />
                : <LockOpen className="w-5 h-5 text-red-400" />
              }
              <span className={`text-xs font-semibold ${full.hasSSL ? 'text-green-400' : 'text-red-400'}`}>
                {full.hasSSL ? 'HTTPS ✓' : 'Pas de SSL'}
              </span>
            </div>

            {/* Mobile */}
            <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${
              full.isResponsive
                ? 'bg-green-400/10 border-green-400/20'
                : 'bg-red-400/10 border-red-400/20'
            }`}>
              <Smartphone className={`w-5 h-5 ${full.isResponsive ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-xs font-semibold ${full.isResponsive ? 'text-green-400' : 'text-red-400'}`}>
                {full.isResponsive ? 'Responsive ✓' : 'Non responsive'}
              </span>
            </div>

            {/* Load time */}
            <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center ${
              full.loadTimeSec <= 3
                ? 'bg-green-400/10 border-green-400/20'
                : full.loadTimeSec <= 6
                ? 'bg-amber-400/10 border-amber-400/20'
                : 'bg-red-400/10 border-red-400/20'
            }`}>
              <Gauge className={`w-5 h-5 ${
                full.loadTimeSec <= 3 ? 'text-green-400'
                : full.loadTimeSec <= 6 ? 'text-amber-400'
                : 'text-red-400'
              }`} />
              <span className={`text-xs font-semibold ${
                full.loadTimeSec <= 3 ? 'text-green-400'
                : full.loadTimeSec <= 6 ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                {full.loadTimeSec.toFixed(1)}s
              </span>
            </div>

            {/* CMS */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center bg-indigo-400/10 border-indigo-400/20">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400 truncate w-full">
                {full.cms ?? 'CMS inconnu'}
              </span>
            </div>
          </div>

          {/* Tech stack */}
          {full.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {full.techStack.map(tech => (
                <Badge key={tech} variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </section>
      )}

      {full && <Separator />}

      {/* Score cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Scores
          </h3>
          <span className="text-xs text-muted-foreground">
            Analysé {relDate(audit.scannedAt)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ScoreGauge score={audit.mobileScore}      label="Mobile" />
          <ScoreGauge score={audit.seoScore}         label="SEO" />
          <ScoreGauge score={audit.performanceScore} label="Performance" />
        </div>
      </section>

      <Separator />

      {/* Issues */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Problèmes détectés
          </h3>
          {audit.issues.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              {highCount > 0 && (
                <span className="text-red-400 font-medium">
                  {highCount} critique{highCount > 1 ? 's' : ''}
                </span>
              )}
              {mediumCount > 0 && (
                <span className="text-amber-400 font-medium">
                  {mediumCount} important{mediumCount > 1 ? 's' : ''}
                </span>
              )}
              {lowCount > 0 && (
                <span className="text-blue-400 font-medium">
                  {lowCount} mineur{lowCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {audit.issues.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Aucun problème majeur détecté</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedIssues.map((issue, i) => {
              const cfg = SEVERITY_CFG[issue.severity]
              const Icon = cfg.icon
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} border-transparent`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.cls}`} />
                  <p className="text-sm flex-1">{issue.label}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/20 ${cfg.cls} flex-shrink-0`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <Button
          variant="outline" size="sm"
          className="mt-4 gap-2"
          onClick={onAudit}
          disabled={isAuditing}
        >
          {isAuditing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          {isAuditing ? 'Audit en cours…' : "Relancer l'audit"}
        </Button>
      </section>
    </div>
  )
}

// ── Tab: Emails ───────────────────────────────────────────────────────────────

function EmailItem({ email, isLast }: { email: MockEmail; isLast: boolean }) {
  const cfg = EMAIL_STATUS_CFG[email.status] ?? EMAIL_STATUS_CFG.SENT
  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-3">
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ring-2 ring-background ${cfg.dotCls}`} />
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-1.5 min-h-[32px]" />}
      </div>
      {/* Content */}
      <div className={`flex-1 min-w-0 ${!isLast ? 'pb-5' : 'pb-1'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{email.subject}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {email.preview}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {relDate(email.sentAt)}
            </span>
          </div>
        </div>
        {email.openedAt && (
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
            <span className="text-blue-400">✓</span> Ouvert {relDate(email.openedAt)}
          </p>
        )}
        {email.repliedAt && (
          <p className="text-[11px] text-green-400 mt-0.5 flex items-center gap-1">
            <span>↩</span> Répondu {relDate(email.repliedAt)}
          </p>
        )}
      </div>
    </div>
  )
}

function EmailsTab({ emails, onNewEmail }: { emails: MockEmail[]; onNewEmail: () => void }) {
  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Historique ({emails.length} email{emails.length !== 1 ? 's' : ''})
        </h3>
        <Button size="sm" className="gap-2 h-8" onClick={onNewEmail}>
          <Plus className="w-3.5 h-3.5" />Nouvel email
        </Button>
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Mail className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Aucun email envoyé</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Génère un email personnalisé avec l'IA pour briser la glace.
            </p>
          </div>
          <Button onClick={onNewEmail}>
            <Mail className="w-4 h-4 mr-2" />Générer un email IA
          </Button>
        </div>
      ) : (
        <div>
          {emails.map((email, i) => (
            <EmailItem key={email.id} email={email} isLast={i === emails.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Notes ────────────────────────────────────────────────────────────────

function NoteItem({ note }: { note: MockNote }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
        <StickyNote className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{note.content}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{relDate(note.createdAt)}</p>
      </div>
    </div>
  )
}

function NotesTab({
  notes, noteInput, onNoteChange, onAddNote,
}: {
  notes: MockNote[]
  noteInput: string
  onNoteChange: (v: string) => void
  onAddNote: () => void
}) {
  return (
    <div className="space-y-5 max-w-xl">
      {/* Add note */}
      <div className="space-y-2">
        <Textarea
          placeholder="Ajouter une note sur ce prospect… (Ctrl+Entrée pour envoyer)"
          value={noteInput}
          onChange={e => onNoteChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAddNote()
          }}
          className="min-h-[90px] resize-none"
        />
        <div className="flex items-center justify-end">
          <Button
            size="sm" className="gap-2 h-8"
            onClick={onAddNote}
            disabled={!noteInput.trim()}
          >
            <Plus className="w-3.5 h-3.5" />Ajouter
          </Button>
        </div>
      </div>

      {notes.length > 0 && <Separator />}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <StickyNote className="w-10 h-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">Aucune note pour ce prospect</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => <NoteItem key={note.id} note={note} />)}
        </div>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function ActionsSidebar({
  prospect, currentStatus, onStatusChange, isAuditing, onAudit, onGenerateEmail,
}: {
  prospect: ProspectDetail
  currentStatus: string
  onStatusChange: (s: string) => void
  isAuditing: boolean
  onAudit: () => void
  onGenerateEmail: () => void
}) {
  return (
    <>
      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Actions rapides
        </h3>
        <div className="space-y-2">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Statut</label>
            <select
              value={currentStatus}
              onChange={e => onStatusChange(e.target.value)}
              className="w-full h-9 px-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
              ))}
            </select>
          </div>

          {/* Audit */}
          {prospect.hasWebsite && (
            <Button
              variant="outline" className="w-full gap-2 h-9 justify-start" size="sm"
              onClick={onAudit}
              disabled={isAuditing}
            >
              {isAuditing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />
              }
              {isAuditing ? 'Audit en cours…' : 'Auditer le site'}
            </Button>
          )}

          {/* Generate email */}
          <Button
            className="w-full gap-2 h-9 justify-start" size="sm"
            onClick={onGenerateEmail}
          >
            <Mail className="w-4 h-4" />Générer un email IA
          </Button>

          {/* Schedule follow-up */}
          <Button
            variant="outline" className="w-full gap-2 h-9 justify-start" size="sm"
            onClick={() => toast.info('Programmer une relance — à venir')}
          >
            <Calendar className="w-4 h-4" />Programmer une relance
          </Button>

          {/* Blacklist */}
          <Button
            variant="outline"
            className={`w-full gap-2 h-9 justify-start ${
              currentStatus === 'BLACKLIST'
                ? 'text-red-600 border-red-600/30 bg-red-600/5'
                : 'text-red-400 hover:text-red-400 hover:bg-red-400/10 border-red-400/20'
            }`}
            size="sm"
            onClick={() => {
              if (currentStatus === 'BLACKLIST') return
              onStatusChange('BLACKLIST')
              toast.warning('Prospect blacklisté', {
                description: 'Il ne recevra plus de communications',
              })
            }}
            disabled={currentStatus === 'BLACKLIST'}
          >
            <Ban className="w-4 h-4" />
            {currentStatus === 'BLACKLIST' ? '✗ Blacklisté' : 'Blacklister'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Statistiques
        </h3>
        <div className="space-y-2.5">
          {[
            { label: 'Emails envoyés', value: prospect.emailsSent,      icon: Send         as LucideIcon },
            { label: 'Notes',          value: prospect._count.notes,    icon: StickyNote   as LucideIcon },
            { label: 'Échanges',       value: prospect._count.emails,   icon: MessageSquare as LucideIcon },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
              <span className="font-bold text-primary">{value}</span>
            </div>
          ))}

          <Separator className="my-0.5" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />Ajouté
            </div>
            <span className="text-xs text-muted-foreground">{relDate(prospect.createdAt)}</span>
          </div>
          {prospect.lastContactAt && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />Contact
              </div>
              <span className="text-xs text-muted-foreground">{relDate(prospect.lastContactAt)}</span>
            </div>
          )}
          {prospect.siteScore !== null && (
            <>
              <Separator className="my-0.5" />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />Score site
                </div>
                <div className="flex items-center gap-1.5">
                  <ScoreCircle score={prospect.siteScore} size={24} />
                  <span className={`text-xs font-semibold ${scoreColor(prospect.siteScore)}`}>
                    {prospect.siteScore}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProspectDetailClient({ id }: { id: string }) {
  const [data, setData]               = useState<ProspectDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [currentStatus, setCurrentStatus] = useState('')
  const [noteInput, setNoteInput]     = useState('')
  const [localNotes, setLocalNotes]   = useState<MockNote[]>([])
  const [localEmails, setLocalEmails] = useState<MockEmail[]>([])
  const [localAudit, setLocalAudit]   = useState<AuditResult | null>(null)
  const [isAuditing, setIsAuditing]   = useState(false)
  const [showEmailComposer, setShowEmailComposer] = useState(false)

  useEffect(() => {
    fetch(`/api/prospects/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: ProspectDetail) => {
        setData(d)
        setCurrentStatus(d.status)
        setLocalNotes(d.notes)
        setLocalEmails(d.emails)
      })
      .catch(() => toast.error('Prospect introuvable'))
      .finally(() => setLoading(false))
  }, [id])

  function handleEmailSent(email: SentEmailSummary) {
    setLocalEmails(prev => [email as MockEmail, ...prev])
    setCurrentStatus('CONTACTED')
    setData(prev => prev
      ? { ...prev, status: 'CONTACTED', emailsSent: prev.emailsSent + 1 }
      : prev,
    )
  }

  async function runAudit() {
    if (!data?.website) {
      toast.error('Aucune URL de site web pour ce prospect')
      return
    }
    setIsAuditing(true)
    const toastId = toast.loading('Audit Playwright en cours…', {
      description: data.website,
    })
    try {
      const res = await fetch('/api/prospects/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.website, prospectId: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur inconnue')

      const result: AuditResult = json.audit
      setLocalAudit(result)

      // Update score in header if changed
      if (json.scoring) {
        setData(prev => prev
          ? { ...prev, prospectScore: json.scoring.prospectScore, siteScore: json.scoring.siteScore, status: 'AUDITED' }
          : prev
        )
        setCurrentStatus('AUDITED')
      }

      const highCount = result.issues.filter((i: { severity: string }) => i.severity === 'high').length
      toast.success('Audit terminé !', {
        id: toastId,
        description: highCount > 0
          ? `${highCount} problème${highCount > 1 ? 's' : ''} critique${highCount > 1 ? 's' : ''} détecté${highCount > 1 ? 's' : ''}`
          : 'Aucun problème critique détecté',
      })
    } catch (err) {
      toast.error("Audit échoué", {
        id: toastId,
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setIsAuditing(false)
    }
  }

  function handleStatusChange(newStatus: string) {
    setCurrentStatus(newStatus)
    toast.success(`Statut → ${STATUS_CFG[newStatus]?.label ?? newStatus}`, {
      description: 'Non persisté sans base de données',
    })
  }

  function addNote() {
    if (!noteInput.trim()) return
    const newNote: MockNote = {
      id: `local-${Date.now()}`,
      content: noteInput.trim(),
      createdAt: new Date().toISOString(),
    }
    setLocalNotes(prev => [newNote, ...prev])
    setNoteInput('')
    toast.success('Note ajoutée (session en cours)')
  }

  if (loading) return <DetailSkeleton />

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <AlertCircle className="w-14 h-14 text-muted-foreground/40" />
        <div>
          <h2 className="text-xl font-semibold">Prospect introuvable</h2>
          <p className="text-sm text-muted-foreground mt-1">L'ID « {id} » ne correspond à aucun prospect.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/prospects"><ArrowLeft className="w-4 h-4 mr-2" />Retour aux prospects</Link>
        </Button>
      </div>
    )
  }

  const statusCfg = STATUS_CFG[currentStatus] ?? STATUS_CFG.NEW
  const priority  = PRIORITY_CFG[data.priority] ?? PRIORITY_CFG.MEDIUM

  // localAudit (Playwright temps réel) prend le dessus sur data.audit (mock)
  const activeAudit: AuditData | null = localAudit ?? data.audit ?? null
  const auditBadgeCount = activeAudit
    ? activeAudit.issues.filter(i => i.severity === 'high').length
    : 0

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b bg-card/20 px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Back */}
          <Button variant="ghost" size="sm" asChild className="gap-1.5 h-8 -ml-2 flex-shrink-0">
            <Link href="/prospects">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-muted-foreground">Prospects</span>
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6 flex-shrink-0" />

          {/* Score circle */}
          <div className="flex-shrink-0">
            <ScoreCircle score={data.prospectScore} size={52} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{data.companyName}</h1>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
              <span>{data.industry}</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{data.city}
              </span>
              {data.googleRating && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {data.googleRating.toFixed(1)}
                    <span className="text-muted-foreground">({data.googleReviewCount})</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Priority + status dropdown */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-sm font-bold hidden md:inline ${priority.cls}`}>
              {priority.label}
            </span>
            <select
              value={currentStatus}
              onChange={e => handleStatusChange(e.target.value)}
              className={`h-8 px-2.5 rounded-md border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring bg-transparent ${statusCfg.cls} ${statusCfg.bg}`}
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s} className="bg-background text-foreground font-normal">
                  {STATUS_CFG[s]?.label ?? s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main tabs */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="infos">
            <TabsList className="mb-6 h-9">
              <TabsTrigger value="infos" className="text-sm px-4">Infos</TabsTrigger>
              <TabsTrigger value="audit" className="text-sm px-4">
                Audit
                {auditBadgeCount > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full bg-red-400/20 text-red-400 text-[9px] font-bold flex items-center justify-center">
                    {auditBadgeCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-sm px-4">
                Emails
                {localEmails.length > 0 && (
                  <span className="ml-1 text-xs opacity-50">({localEmails.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-sm px-4">
                Notes
                {localNotes.length > 0 && (
                  <span className="ml-1 text-xs opacity-50">({localNotes.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="infos" className="mt-0">
              <InfosTab prospect={data} />
            </TabsContent>
            <TabsContent value="audit" className="mt-0">
              <AuditTab
                audit={activeAudit}
                prospect={data}
                isAuditing={isAuditing}
                onAudit={runAudit}
              />
            </TabsContent>
            <TabsContent value="emails" className="mt-0">
              <EmailsTab emails={localEmails} onNewEmail={() => setShowEmailComposer(true)} />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <NotesTab
                notes={localNotes}
                noteInput={noteInput}
                onNoteChange={setNoteInput}
                onAddNote={addNote}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-68 xl:w-72 border-l flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-card/10">
          <ActionsSidebar
            prospect={data}
            currentStatus={currentStatus}
            onStatusChange={handleStatusChange}
            isAuditing={isAuditing}
            onAudit={runAudit}
            onGenerateEmail={() => setShowEmailComposer(true)}
          />
        </div>
      </div>

      {/* ── Email Composer dialog ──────────────────────────────────────────── */}
      <EmailComposer
        open={showEmailComposer}
        onOpenChange={setShowEmailComposer}
        prospectId={id}
        prospectName={data.companyName}
        prospectEmail={data.email ?? null}
        auditData={localAudit}
        onEmailSent={handleEmailSent}
      />
    </div>
  )
}
