'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Mail, Eye, MousePointer, Reply, AlertCircle, Filter } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreCircle } from '@/components/prospects/ScoreCircle'

// ── Types ─────────────────────────────────────────────────────────────────────

type EmailStatus = 'SENT' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'FAILED'

type EmailRow = {
  id: string
  subject: string
  status: EmailStatus
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  repliedAt: string | null
  createdAt: string
  prospect: {
    id: string
    companyName: string
    city: string
    industry: string
    email: string | null
  }
  campaign: { id: string; name: string } | null
}

type EmailStats = {
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  openRate: number
  replyRate: number
}

type ApiResponse = {
  emails: EmailRow[]
  total: number
  page: number
  pages: number
  stats: EmailStats
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EmailStatus | 'all', { label: string; color: string; icon: React.ElementType }> = {
  all:     { label: 'Tous',      color: 'bg-muted text-muted-foreground', icon: Mail },
  SENT:    { label: 'Envoyé',    color: 'bg-blue-500/15 text-blue-400',   icon: Mail },
  OPENED:  { label: 'Ouvert',    color: 'bg-indigo-500/15 text-indigo-400', icon: Eye },
  CLICKED: { label: 'Cliqué',    color: 'bg-violet-500/15 text-violet-400', icon: MousePointer },
  REPLIED: { label: 'Répondu',   color: 'bg-green-500/15 text-green-400',  icon: Reply },
  BOUNCED: { label: 'Rejeté',    color: 'bg-red-500/15 text-red-400',      icon: AlertCircle },
  FAILED:  { label: 'Échoué',    color: 'bg-red-500/15 text-red-400',      icon: AlertCircle },
}

function StatusBadge({ status }: { status: EmailStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.SENT
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 animate-pulse">
      <div className="w-32 h-3 bg-muted rounded" />
      <div className="flex-1 h-3 bg-muted rounded" />
      <div className="w-20 h-5 bg-muted rounded-full" />
      <div className="w-24 h-3 bg-muted rounded" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',     label: 'Tous' },
  { key: 'SENT',    label: 'Envoyés' },
  { key: 'OPENED',  label: 'Ouverts' },
  { key: 'CLICKED', label: 'Cliqués' },
  { key: 'REPLIED', label: 'Répondus' },
  { key: 'BOUNCED', label: 'Rejetés' },
]

export function EmailsClient() {
  const [data, setData]         = useState<ApiResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [page, setPage]         = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/emails?status=${filter}&page=${page}`)
      const json = await res.json() as ApiResponse
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { void load() }, [load])

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [filter])

  const stats = data?.stats

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Emails envoyés"   value={stats?.sent ?? '—'} />
          <StatCard label="Taux d'ouverture" value={stats ? `${stats.openRate}%` : '—'}  color="text-indigo-400" sub={`${stats?.opened ?? 0} ouverts`} />
          <StatCard label="Taux de réponse"  value={stats ? `${stats.replyRate}%` : '—'} color="text-green-400"  sub={`${stats?.replied ?? 0} réponses`} />
          <StatCard label="Rejetés"          value={stats?.bounced ?? '—'} color="text-red-400" />
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              {data.total} email{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_2fr_100px_120px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Prospect</span>
            <span>Sujet</span>
            <span>Statut</span>
            <span>Date</span>
          </div>

          {/* Rows */}
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
          ) : !data || data.emails.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun email</p>
              <p className="text-sm mt-1">Les emails envoyés depuis les fiches prospects apparaîtront ici.</p>
            </div>
          ) : (
            data.emails.map(email => (
              <div
                key={email.id}
                className="grid grid-cols-[1fr_2fr_100px_120px] gap-4 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors items-center"
              >
                {/* Prospect */}
                <div className="min-w-0">
                  <Link
                    href={`/prospects/${email.prospect.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {email.prospect.companyName}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.prospect.city} · {email.prospect.industry}
                  </p>
                  {email.campaign && (
                    <Link href={`/campaigns/${email.campaign.id}`} className="text-[10px] text-primary/70 hover:text-primary transition-colors">
                      {email.campaign.name}
                    </Link>
                  )}
                </div>

                {/* Sujet */}
                <p className="text-sm text-foreground/80 truncate">{email.subject}</p>

                {/* Statut */}
                <StatusBadge status={email.status} />

                {/* Date */}
                <p className="text-xs text-muted-foreground">
                  {email.sentAt
                    ? formatDistanceToNow(new Date(email.sentAt), { addSuffix: true, locale: fr })
                    : '—'
                  }
                </p>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Précédent
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} / {data.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant →
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
