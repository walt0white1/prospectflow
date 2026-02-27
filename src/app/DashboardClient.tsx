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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

// ── Palette pour le Pie ───────────────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  OPENSTREETMAP: '#6366f1',
  GOOGLE_MAPS:   '#10b981',
  MANUAL:        '#f59e0b',
  IMPORT_CSV:    '#3b82f6',
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="bg-[#111218] border-white/8">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40">{sub}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Funnel ────────────────────────────────────────────────────────────────────

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.value ?? 1
  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const pct = max > 0 ? Math.round((step.value / max) * 100) : 0
        const conversion = i > 0 && steps[i - 1].value > 0
          ? Math.round((step.value / steps[i - 1].value) * 100)
          : null
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                {conversion !== null && (
                  <span className="text-white/30">→ {conversion}%</span>
                )}
                <span className="text-white font-semibold">{step.value}</span>
              </div>
            </div>
            <div className="h-5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: step.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity icon ─────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const map: Record<ActivityItem['type'], { Icon: React.ElementType; bg: string; fg: string }> = {
    email_sent:      { Icon: Send,            bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
    email_opened:    { Icon: Eye,             bg: 'bg-blue-500/15',   fg: 'text-blue-400'   },
    email_replied:   { Icon: MessageSquare,   bg: 'bg-amber-500/15',  fg: 'text-amber-400'  },
    prospect_added:  { Icon: UserPlus,        bg: 'bg-white/8',       fg: 'text-white/50'   },
    status_won:      { Icon: Trophy,          bg: 'bg-green-500/15',  fg: 'text-green-400'  },
    status_meeting:  { Icon: CalendarCheck,   bg: 'bg-emerald-500/15',fg: 'text-emerald-400'},
  }
  const { Icon, bg, fg } = map[type] ?? map.email_sent
  return (
    <div className={`p-1.5 rounded-full ${bg} shrink-0`}>
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

// ── Custom Tooltip recharts ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1b23] border border-white/10 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="text-white/50 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}</span>
          <span className="text-white font-semibold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className ?? ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
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
      <div className="flex items-center justify-center h-64 text-white/40">
        Impossible de charger les données.
      </div>
    )
  }

  const { stats, lineChart, funnel, topHot, recentActivity, sourceBreakdown } = data

  // Vérifier si le graphique a des données
  const hasChartData = lineChart.some(p => p.sent > 0 || p.opened > 0 || p.replied > 0)

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-white/40">Vue d&apos;ensemble de votre activité</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="border-white/10 text-white/60 hover:text-white hover:border-white/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* ── 4 Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total prospects"
          value={stats.totalProspects}
          sub="dans le CRM"
          icon={Users}
          color="bg-indigo-500/20"
        />
        <StatCard
          label="Emails ce mois"
          value={stats.emailsSentThisMonth}
          sub="envoyés ce mois-ci"
          icon={Mail}
          color="bg-blue-500/20"
        />
        <StatCard
          label="Taux d'ouverture"
          value={`${stats.openRate}%`}
          sub="sur total envoyé"
          icon={Eye}
          color="bg-amber-500/20"
        />
        <StatCard
          label="RDV obtenus"
          value={stats.meetingsBooked}
          sub="en cours / obtenus"
          icon={CalendarCheck}
          color="bg-green-500/20"
        />
      </div>

      {/* ── Row 2 : Line chart + Funnel ───────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Line chart */}
        <Card className="col-span-12 lg:col-span-7 bg-[#111218] border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Emails sur 30 jours
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineChart} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12, color: 'rgba(255,255,255,0.5)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    name="Envoyés"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    name="Ouverts"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="replied"
                    name="Répondu"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-white/30 gap-2">
                <Mail className="h-8 w-8 opacity-40" />
                <p className="text-sm">Aucun email envoyé ces 30 derniers jours</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card className="col-span-12 lg:col-span-5 bg-[#111218] border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-400" />
              Funnel de conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <FunnelChart steps={funnel} />
            {/* Taux global */}
            {funnel[0].value > 0 && (
              <p className="text-xs text-white/30 mt-4 text-center">
                Taux de conversion global :{' '}
                <span className="text-white/60 font-semibold">
                  {Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 100)}%
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3 : Top HOT + Activité + Pie ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Top 10 HOT */}
        <Card className="col-span-12 lg:col-span-7 bg-[#111218] border-white/8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-400" />
                Top prospects HOT à contacter
              </CardTitle>
              <Link href="/prospects?priority=HOT">
                <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 text-xs h-7 px-2">
                  Voir tous <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topHot.length === 0 ? (
              <div className="py-10 text-center text-white/30 text-sm">
                Aucun prospect HOT non contacté
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {topHot.map((p, i) => (
                  <Link key={p.id} href={`/prospects/${p.id}`}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors group cursor-pointer">
                      {/* Rang */}
                      <span className="text-xs text-white/25 w-4 shrink-0 font-mono">
                        {i + 1}
                      </span>

                      {/* Score */}
                      <ScoreCircle score={p.prospectScore} size={36} />

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                          {p.companyName}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {p.industry} · {p.city}
                        </p>
                      </div>

                      {/* Indicateurs */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p.googleRating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-400">
                            <Star className="h-3 w-3" />
                            {p.googleRating}
                          </span>
                        )}
                        {p.phone && (
                          <Phone className="h-3.5 w-3.5 text-white/25" />
                        )}
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
          </CardContent>
        </Card>

        {/* Colonne droite : Activité + Pie */}
        <div className="col-span-12 lg:col-span-5 space-y-4">

          {/* Activité récente */}
          <Card className="bg-[#111218] border-white/8">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white/80">
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">Aucune activité récente</p>
              ) : (
                <div className="space-y-0">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
                      <ActivityIcon type={item.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 leading-snug truncate">
                          {activityLabel(item)}
                        </p>
                        {item.meta && item.type !== 'prospect_added' && (
                          <p className="text-[10px] text-white/30 truncate mt-0.5">{item.meta}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-white/25 shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(item.date), { locale: fr, addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Répartition par source */}
          <Card className="bg-[#111218] border-white/8">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                Répartition par source
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {sourceBreakdown.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">Aucune donnée</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie
                        data={sourceBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                      >
                        {sourceBreakdown.map((entry) => (
                          <Cell
                            key={entry.source}
                            fill={PIE_COLORS[entry.source] ?? '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1a1b23',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
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
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: PIE_COLORS[item.source] ?? '#6b7280' }}
                          />
                          <span className="text-xs text-white/60 flex-1 truncate">{item.label}</span>
                          <span className="text-xs font-semibold text-white">{item.count}</span>
                          <span className="text-[10px] text-white/30 w-7 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
