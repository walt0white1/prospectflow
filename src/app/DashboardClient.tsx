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
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Users,
  Mail,
  Eye,
  CalendarCheck,
  TrendingUp,
  Phone,
  Globe,
  Star,
  Flame,
  UserPlus,
  MessageSquare,
  Trophy,
  RefreshCw,
  ArrowRight,
  Send,
  Zap,
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

const PIE_COLORS: Record<string, string> = {
  OPENSTREETMAP: '#818cf8',
  GOOGLE_MAPS:   '#34d399',
  MANUAL:        '#fbbf24',
  IMPORT_CSV:    '#60a5fa',
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  gradient: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#111218] border border-white/6 p-5 group hover:border-white/10 transition-all duration-300">
      {/* gradient glow top */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${gradient}`} />
      {/* bg glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 blur-2xl ${gradient}`} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          <p className="text-xs text-white/35 mt-1">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} opacity-80`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// ── Funnel ────────────────────────────────────────────────────────────────────

const FUNNEL_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-green-500',
]

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.value ?? 1
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = max > 0 ? Math.round((step.value / max) * 100) : 0
        const conversion = i > 0 && steps[i - 1].value > 0
          ? Math.round((step.value / steps[i - 1].value) * 100)
          : null
        return (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                {conversion !== null && (
                  <span className="text-white/25 text-[10px] bg-white/5 px-1.5 py-0.5 rounded">→ {conversion}%</span>
                )}
                <span className="text-white font-bold tabular-nums">{step.value}</span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${FUNNEL_GRADIENTS[i % FUNNEL_GRADIENTS.length]} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity ──────────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const map: Record<ActivityItem['type'], { Icon: React.ElementType; bg: string; fg: string }> = {
    email_sent:      { Icon: Send,          bg: 'bg-indigo-500/20', fg: 'text-indigo-400' },
    email_opened:    { Icon: Eye,           bg: 'bg-sky-500/20',    fg: 'text-sky-400'    },
    email_replied:   { Icon: MessageSquare, bg: 'bg-amber-500/20',  fg: 'text-amber-400'  },
    prospect_added:  { Icon: UserPlus,      bg: 'bg-white/8',       fg: 'text-white/50'   },
    status_won:      { Icon: Trophy,        bg: 'bg-green-500/20',  fg: 'text-green-400'  },
    status_meeting:  { Icon: CalendarCheck, bg: 'bg-emerald-500/20',fg: 'text-emerald-400'},
  }
  const { Icon, bg, fg } = map[type] ?? map.email_sent
  return (
    <div className={`p-1.5 rounded-lg ${bg} shrink-0`}>
      <Icon className={`h-3.5 w-3.5 ${fg}`} />
    </div>
  )
}

function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case 'email_sent':     return `Email envoyé à ${item.companyName}`
    case 'email_opened':   return `Email ouvert par ${item.companyName}`
    case 'email_replied':  return `Réponse de ${item.companyName}`
    case 'prospect_added': return `${item.companyName} ajouté au CRM`
    case 'status_won':     return `Client gagné — ${item.companyName}`
    case 'status_meeting': return `RDV obtenu avec ${item.companyName}`
    default:               return item.companyName
  }
}

// ── Tooltip recharts ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#16171f] border border-white/10 rounded-xl p-3 text-xs space-y-1.5 shadow-2xl">
      <p className="text-white/40 mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}</span>
          <span className="text-white font-bold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/4 rounded-xl ${className ?? ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[106px]" />)}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 lg:col-span-7 h-72" />
        <Skeleton className="col-span-12 lg:col-span-5 h-72" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 lg:col-span-7 h-96" />
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm font-semibold text-white/70">{label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const json = await res.json() as DashboardData
        setData(json)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <DashboardSkeleton />
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30">
        Impossible de charger les données.
      </div>
    )
  }

  const { stats, lineChart, funnel, topHot, recentActivity, sourceBreakdown } = data
  const hasChartData = lineChart.some(p => p.sent > 0 || p.opened > 0 || p.replied > 0)

  return (
    <div className="space-y-7">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Vue d&apos;ensemble</h1>
            <p className="text-xs text-white/35 mt-0.5">Votre activité de prospection</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="border-white/8 bg-white/3 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/6 rounded-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* ── 4 Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Prospects"
          value={stats.totalProspects}
          sub="dans le CRM"
          icon={Users}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatCard
          label="Emails ce mois"
          value={stats.emailsSentThisMonth}
          sub="envoyés ce mois"
          icon={Mail}
          gradient="from-sky-500 to-blue-600"
        />
        <StatCard
          label="Taux ouverture"
          value={`${stats.openRate}%`}
          sub="sur total envoyé"
          icon={Eye}
          gradient="from-amber-400 to-orange-500"
        />
        <StatCard
          label="RDV obtenus"
          value={stats.meetingsBooked}
          sub="en cours / obtenus"
          icon={CalendarCheck}
          gradient="from-emerald-400 to-green-600"
        />
      </div>

      {/* ── Row 2 : Line chart + Funnel ───────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Line chart */}
        <div className="col-span-12 lg:col-span-7 rounded-xl bg-[#111218] border border-white/6 p-5">
          <SectionTitle icon={TrendingUp} label="Emails sur 30 jours" color="text-indigo-400" />
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={lineChart} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16, color: 'rgba(255,255,255,0.4)' }} />
                <Line type="monotone" dataKey="sent"    name="Envoyés" stroke="#818cf8" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="opened"  name="Ouverts"  stroke="#34d399" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="replied" name="Répondu"  stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[210px] flex flex-col items-center justify-center text-white/25 gap-3">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">Aucun email envoyé ces 30 derniers jours</p>
            </div>
          )}
        </div>

        {/* Funnel */}
        <div className="col-span-12 lg:col-span-5 rounded-xl bg-[#111218] border border-white/6 p-5">
          <SectionTitle icon={ArrowRight} label="Funnel de conversion" color="text-violet-400" />
          <FunnelChart steps={funnel} />
          {funnel[0].value > 0 && (
            <div className="mt-5 pt-4 border-t border-white/5 text-center">
              <span className="text-xs text-white/30">Conversion globale </span>
              <span className="text-sm font-bold text-white/80">
                {Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3 : Top HOT + Activité + Pie ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Top HOT */}
        <div className="col-span-12 lg:col-span-7 rounded-xl bg-[#111218] border border-white/6 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-white/70">Top prospects HOT</span>
            </div>
            <Link href="/prospects?priority=HOT">
              <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 text-xs h-7 px-2 hover:bg-indigo-500/10">
                Voir tous <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {topHot.length === 0 ? (
            <div className="py-10 text-center text-white/25 text-sm">
              Aucun prospect HOT non contacté
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {topHot.map((p, i) => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors group cursor-pointer">
                    <span className="text-xs text-white/20 w-4 shrink-0 font-mono tabular-nums">{i + 1}</span>
                    <ScoreCircle score={p.prospectScore} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {p.companyName}
                      </p>
                      <p className="text-xs text-white/35 truncate">
                        {p.industry} · {p.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.googleRating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-400">
                          <Star className="h-3 w-3" />
                          {p.googleRating}
                        </span>
                      )}
                      {p.phone && <Phone className="h-3.5 w-3.5 text-white/20" />}
                      {!p.hasWebsite && (
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px] px-1.5 py-0">
                          Sans site
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="col-span-12 lg:col-span-5 space-y-4">

          {/* Activité récente */}
          <div className="rounded-xl bg-[#111218] border border-white/6 p-5">
            <SectionTitle icon={Zap} label="Activité récente" color="text-sky-400" />
            {recentActivity.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-4">Aucune activité récente</p>
            ) : (
              <div className="space-y-0">
                {recentActivity.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-white/4 last:border-0">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/65 leading-snug truncate">{activityLabel(item)}</p>
                      {item.meta && item.type !== 'prospect_added' && (
                        <p className="text-[10px] text-white/25 truncate mt-0.5">{item.meta}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(item.date), { locale: fr, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source breakdown */}
          <div className="rounded-xl bg-[#111218] border border-white/6 p-5">
            <SectionTitle icon={Globe} label="Répartition par source" color="text-blue-400" />
            {sourceBreakdown.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-4">Aucune donnée</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={sourceBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={46}
                      paddingAngle={3}
                    >
                      {sourceBreakdown.map((entry) => (
                        <Cell key={entry.source} fill={PIE_COLORS[entry.source] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#16171f',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sourceBreakdown.map(item => {
                    const total = sourceBreakdown.reduce((s, x) => s + x.count, 0)
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                    return (
                      <div key={item.source} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[item.source] ?? '#6b7280' }} />
                        <span className="text-xs text-white/55 flex-1 truncate">{item.label}</span>
                        <span className="text-xs font-bold text-white">{item.count}</span>
                        <span className="text-[10px] text-white/25 w-7 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
