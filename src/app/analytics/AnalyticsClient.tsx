'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { TrendingUp, Mail, Users, Target, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { CampaignStat, SectorStat, WeekdayStat, AnalyticsData } from '../api/analytics/route'

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiResponse = {
  campaigns: CampaignStat[]
  sectors: SectorStat[]
  weekdays: WeekdayStat[]
  summary: AnalyticsData['summary']
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-foreground' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    '#6366f1',
  PAUSED:    '#f59e0b',
  COMPLETED: '#10b981',
  DRAFT:     '#6b7280',
}

// ── Tooltip personnalisé ───────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name} : <span className="text-foreground font-medium">{p.value}{p.name.includes('Taux') ? '%' : ''}</span>
        </p>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className ?? ''}`} />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json() as Promise<ApiResponse>)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const s = data?.summary

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">

        {/* Résumé global */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          )) : <>
            <StatCard label="Total prospects"       value={s?.totalProspects ?? 0}  icon={Users}      />
            <StatCard label="Emails envoyés"        value={s?.totalEmails ?? 0}     icon={Mail}       />
            <StatCard label="Taux d'ouverture moy." value={`${s?.avgOpenRate ?? 0}%`} icon={TrendingUp} color="text-indigo-400" />
            <StatCard label="Taux de réponse moy."  value={`${s?.avgReplyRate ?? 0}%`} icon={Target}   color="text-green-400"  />
            <StatCard label="RDV obtenus"           value={s?.totalMeetings ?? 0}   icon={Trophy}     color="text-amber-400"  />
            <StatCard label="Taux de conversion"    value={`${s?.conversionRate ?? 0}%`} icon={TrendingUp} color="text-violet-400" sub="prospects → réponse" />
          </>}
        </div>

        {/* Performance campagnes */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Performance par campagne</h2>
          {loading ? <Skeleton className="h-64 rounded-xl" /> : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Campagne</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="text-right px-4 py-3">Envoyés</th>
                    <th className="text-right px-4 py-3">Ouverts</th>
                    <th className="text-right px-4 py-3">Répondus</th>
                    <th className="text-right px-4 py-3">Taux ouv.</th>
                    <th className="text-right px-4 py-3">Taux rép.</th>
                    <th className="text-right px-4 py-3">RDV</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.campaigns ?? []).map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[c.status] ?? '#6b7280' }} />
                          <span className="text-muted-foreground">{c.status === 'ACTIVE' ? 'Active' : c.status === 'PAUSED' ? 'Pause' : c.status === 'COMPLETED' ? 'Terminée' : 'Brouillon'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.sent}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.opened}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.replied}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-indigo-400 font-medium">{c.openRate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-400 font-medium">{c.replyRate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-medium">{c.meetings}</td>
                    </tr>
                  ))}
                  {(data?.campaigns ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        Aucune campagne
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top secteurs */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Top secteurs (prospects)</h2>
            {loading ? <Skeleton className="h-64 rounded-xl" /> : (
              <div className="bg-card border border-border rounded-xl p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.sectors ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis dataKey="sector" type="category" width={110} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="count" name="Prospects" radius={[0, 4, 4, 0]} fill="#6366f1" />
                    <Bar dataKey="hot"   name="HOT"       radius={[0, 4, 4, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Taux d'ouverture par jour de semaine */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Taux d'ouverture par jour</h2>
            {loading ? <Skeleton className="h-64 rounded-xl" /> : (
              <div className="bg-card border border-border rounded-xl p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data?.weekdays ?? []}>
                    <PolarGrid stroke="#1e2030" />
                    <PolarAngleAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Radar
                      name="Taux d'ouverture (%)"
                      dataKey="openRate"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.25}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

        </div>

        {/* Secteurs — taux de contact */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Taux de contact par secteur</h2>
          {loading ? <Skeleton className="h-48 rounded-xl" /> : (
            <div className="bg-card border border-border rounded-xl p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.sectors ?? []} margin={{ left: 0, right: 8, bottom: 20 }}>
                  <XAxis dataKey="sector" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar
                    dataKey={(d: SectorStat) => d.count > 0 ? Math.round((d.contacted / d.count) * 100) : 0}
                    name="Taux contact (%)"
                    radius={[4, 4, 0, 0]}
                  >
                    {(data?.sectors ?? []).map((entry, index) => (
                      <Cell key={index} fill={`hsl(${240 + index * 12}, 70%, ${55 + index * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
