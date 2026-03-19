'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import {
  Users,
  Mail,
  Eye,
  CalendarCheck,
  Phone,
  Star,
  Flame,
  UserPlus,
  MessageSquare,
  Trophy,
  RefreshCw,
  ArrowRight,
  Send,
  ArrowUpRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreCircle } from '@/components/prospects/ScoreCircle'
import type {
  DashboardData,
  ActivityItem,
  FunnelStep,
  TopHotItem,
  SourceBreakdownItem,
  LineChartPoint,
} from '@/app/api/dashboard/stats/route'

// ── Tooltip recharts ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d0e14] border border-white/8 rounded-lg p-2.5 text-xs space-y-1 shadow-xl">
      <p className="text-white/30 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-3">
          <span className="text-white/50">{p.name}</span>
          <span className="text-white font-semibold ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Activity icon ─────────────────────────────────────────────────────────────

function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case 'email_sent':     return `Email envoyé à ${item.companyName}`
    case 'email_opened':   return `Email ouvert par ${item.companyName}`
    case 'email_replied':  return `Réponse de ${item.companyName}`
    case 'prospect_added': return `${item.companyName} ajouté`
    case 'status_won':     return `Client gagné — ${item.companyName}`
    case 'status_meeting': return `RDV avec ${item.companyName}`
    default:               return item.companyName
  }
}

function activityDot(type: ActivityItem['type']) {
  const map: Record<ActivityItem['type'], string> = {
    email_sent:     'bg-indigo-400',
    email_opened:   'bg-sky-400',
    email_replied:  'bg-amber-400',
    prospect_added: 'bg-white/20',
    status_won:     'bg-green-400',
    status_meeting: 'bg-emerald-400',
  }
  return map[type] ?? 'bg-white/20'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/4 rounded-lg ${className ?? ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/6 border border-white/6 rounded-xl overflow-hidden">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-none" />)}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <Skeleton className="col-span-12 lg:col-span-7 h-64" />
        <Skeleton className="col-span-12 lg:col-span-5 h-64" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) setData(await res.json() as DashboardData)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <DashboardSkeleton />
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-white/25 text-sm">
      Impossible de charger les données.
    </div>
  )

  const { stats, lineChart, funnel, topHot, recentActivity, sourceBreakdown } = data
  const hasChartData = lineChart.some(p => p.sent > 0 || p.opened > 0 || p.replied > 0)

  return (
    <div className="space-y-10 max-w-6xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Vue d&apos;ensemble</h1>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── 4 Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/6 border border-white/6 rounded-xl overflow-hidden">
        {[
          { label: 'Prospects', value: stats.totalProspects,          sub: 'dans le CRM' },
          { label: 'Emails ce mois', value: stats.emailsSentThisMonth, sub: 'envoyés' },
          { label: 'Taux ouverture', value: `${stats.openRate}%`,      sub: 'sur total envoyé' },
          { label: 'RDV obtenus',   value: stats.meetingsBooked,       sub: 'en cours / obtenus' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#111218] px-6 py-5">
            <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest">{label}</p>
            <p className="text-4xl font-bold text-white mt-2 tracking-tight">{value}</p>
            <p className="text-xs text-white/25 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2 : Line chart + Funnel ───────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Line chart */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium text-white/60">Emails · 30 jours</h2>
            <div className="flex items-center gap-4 text-[11px] text-white/30">
              <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-indigo-400 inline-block" />Envoyés</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-emerald-400 inline-block" />Ouverts</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-amber-400 inline-block" />Répondu</span>
            </div>
          </div>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineChart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="sent"    name="Envoyés" stroke="#818cf8" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="opened"  name="Ouverts"  stroke="#34d399" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="replied" name="Répondu"  stroke="#fbbf24" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-white/20 text-sm border border-white/5 rounded-lg">
              Aucun email envoyé ces 30 derniers jours
            </div>
          )}
        </div>

        {/* Funnel */}
        <div className="col-span-12 lg:col-span-5">
          <h2 className="text-sm font-medium text-white/60 mb-5">Funnel de conversion</h2>
          <div className="space-y-3">
            {funnel.map((step, i) => {
              const max = funnel[0]?.value ?? 1
              const pct = max > 0 ? Math.round((step.value / max) * 100) : 0
              const conversion = i > 0 && funnel[i - 1].value > 0
                ? Math.round((step.value / funnel[i - 1].value) * 100)
                : null
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">{step.label}</span>
                    <div className="flex items-center gap-2">
                      {conversion !== null && (
                        <span className="text-[10px] text-white/20">{conversion}%</span>
                      )}
                      <span className="text-xs font-semibold text-white tabular-nums">{step.value}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500/70 transition-all duration-700"
                      style={{ width: `${pct}%`, opacity: 1 - i * 0.12 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {funnel[0]?.value > 0 && (
            <p className="text-xs text-white/20 mt-4">
              Conversion globale — <span className="text-white/50 font-medium">{Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 100)}%</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Row 3 : Top HOT + Activité ────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Top HOT */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium text-white/60 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-orange-400/70" />
              Prospects HOT à contacter
            </h2>
            <Link href="/prospects?priority=HOT" className="text-xs text-white/25 hover:text-white/50 transition-colors flex items-center gap-1">
              Voir tous <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {topHot.length === 0 ? (
            <p className="text-sm text-white/20 py-8 text-center">Aucun prospect HOT non contacté</p>
          ) : (
            <div className="divide-y divide-white/4">
              {topHot.map((p, i) => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div className="flex items-center gap-4 py-3 hover:bg-white/2 -mx-3 px-3 rounded-lg transition-colors group">
                    <span className="text-xs text-white/15 w-4 tabular-nums font-mono">{i + 1}</span>
                    <ScoreCircle score={p.prospectScore} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{p.companyName}</p>
                      <p className="text-xs text-white/30 truncate">{p.industry} · {p.city}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.googleRating && (
                        <span className="text-xs text-amber-400/70 flex items-center gap-0.5">
                          <Star className="h-3 w-3" />{p.googleRating}
                        </span>
                      )}
                      {p.phone && <Phone className="h-3 w-3 text-white/15" />}
                      {!p.hasWebsite && (
                        <span className="text-[10px] text-red-400/60 bg-red-400/8 px-1.5 py-0.5 rounded">Sans site</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="col-span-12 lg:col-span-5">
          <h2 className="text-sm font-medium text-white/60 mb-5">Activité récente</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-white/20 py-8 text-center">Aucune activité</p>
          ) : (
            <div className="space-y-0">
              {recentActivity.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/4 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${activityDot(item.type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/55 leading-snug truncate">{activityLabel(item)}</p>
                  </div>
                  <span className="text-[10px] text-white/20 shrink-0 mt-0.5 tabular-nums">
                    {formatDistanceToNow(new Date(item.date), { locale: fr, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
