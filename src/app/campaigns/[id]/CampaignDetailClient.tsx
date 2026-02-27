'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, Play, Pause, CheckCircle, FileText,
  Mail, Eye, MessageSquare, CalendarCheck, Users,
  Zap, MapPin, Tag, TrendingUp, Send, RotateCcw,
  Ban, ChevronRight, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreCircle } from '@/components/prospects/ScoreCircle'
import type { MockCampaignDetail, CampaignStatus, SequenceStep } from '@/lib/mock-campaigns'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Brouillon', color: 'bg-white/8 text-white/50 border-white/10',          icon: FileText },
  ACTIVE:    { label: 'Active',    color: 'bg-green-500/15 text-green-400 border-green-500/25', icon: Play },
  PAUSED:    { label: 'En pause',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/25', icon: Pause },
  COMPLETED: { label: 'Terminée', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25',    icon: CheckCircle },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, color, icon: Icon } = STATUS_CONFIG[status]
  return (
    <Badge className={`${color} border text-xs font-medium flex items-center gap-1.5`}>
      {status === 'ACTIVE' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {status !== 'ACTIVE' && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  )
}

// ── Sequence flow ─────────────────────────────────────────────────────────────

const STEP_COLORS = [
  { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/25' },
  { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25' },
  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/25' },
]

const STEP_ICONS = [Send, RotateCcw, RotateCcw]

function SequenceFlow({ sequence }: { sequence: SequenceStep[] }) {
  return (
    <div className="flex items-stretch gap-0">
      {sequence.map((step, i) => {
        const c = STEP_COLORS[i] ?? STEP_COLORS[0]
        const Icon = STEP_ICONS[i] ?? Mail
        return (
          <div key={i} className="flex items-center">
            <div className={`${c.bg} border ${c.border} rounded-xl p-4 text-center min-w-[120px]`}>
              <div className={`w-8 h-8 rounded-full ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`h-4 w-4 ${c.text}`} />
              </div>
              <p className={`text-xs font-semibold ${c.text}`}>J+{step.delay}</p>
              <p className="text-xs text-white/70 mt-0.5">{step.label}</p>
            </div>
            {i < sequence.length - 1 && (
              <div className="flex flex-col items-center px-2">
                <ChevronRight className="h-4 w-4 text-white/20" />
                <span className="text-[9px] text-white/25 mt-0.5">
                  +{sequence[i + 1].delay - step.delay}j
                </span>
              </div>
            )}
          </div>
        )
      })}
      {/* Stop rules */}
      <div className="flex flex-col justify-center ml-4 pl-4 border-l border-white/8 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="text-green-400">⚡</span> Stop si réponse (webhook)
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <Ban className="h-3 w-3 text-red-400/60" /> Stop si blacklist
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <Clock className="h-3 w-3 text-white/30" /> Max {sequence.length} emails / prospect
        </div>
      </div>
    </div>
  )
}

// ── Prospect step badge ───────────────────────────────────────────────────────

function StepBadge({ step, total }: { step: number; total: number }) {
  const colors = ['bg-indigo-500/15 text-indigo-400', 'bg-purple-500/15 text-purple-400', 'bg-blue-500/15 text-blue-400']
  const c = colors[Math.min(step, colors.length - 1)]
  return (
    <Badge className={`${c} border-0 text-[10px] font-medium`}>
      Étape {step + 1}/{total}
    </Badge>
  )
}

function StopBadge({ reason }: { reason: 'replied' | 'blacklist' }) {
  if (reason === 'replied') {
    return <Badge className="bg-green-500/15 text-green-400 border-0 text-[10px]">✓ Réponse</Badge>
  }
  return <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">🚫 Blacklist</Badge>
}

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau', AUDITED: 'Audité', CONTACTED: 'Contacté',
  OPENED: 'Ouvert', REPLIED: 'Répondu', MEETING: 'RDV',
  PROPOSAL: 'Proposition', WON: 'Gagné', LOST: 'Perdu', BLACKLIST: 'Blacklist',
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<MockCampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      if (res.ok) {
        const json = await res.json() as { campaign: MockCampaignDetail }
        setData(json.campaign)
      } else if (res.status === 404) {
        toast.error('Campagne introuvable')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleLaunch = async () => {
    if (!data) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' })
      const json = await res.json() as { message: string }
      toast.success(json.message)
      setData(prev => prev ? { ...prev, status: 'ACTIVE' } : prev)
    } catch {
      toast.error('Erreur lors du lancement')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChange = async (status: CampaignStatus) => {
    if (!data) return
    setActionLoading(true)
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setData(prev => prev ? { ...prev, status } : prev)
      toast.success(
        status === 'ACTIVE'   ? 'Campagne reprise' :
        status === 'PAUSED'   ? 'Campagne mise en pause' :
        status === 'COMPLETED' ? 'Campagne archivée' : 'Statut mis à jour',
      )
    } catch {
      toast.error('Erreur')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-xl" />)}
        </div>
        <div className="h-40 bg-white/5 animate-pulse rounded-xl" />
        <div className="h-80 bg-white/5 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-white/40">Campagne introuvable</p>
        <Link href="/campaigns">
          <Button variant="outline" className="border-white/10 text-white/60">
            <ArrowLeft className="h-4 w-4 mr-2" />Retour aux campagnes
          </Button>
        </Link>
      </div>
    )
  }

  const openRate = data.totalSent > 0 ? Math.round((data.totalOpened / data.totalSent) * 100) : 0
  const replyRate = data.totalSent > 0 ? Math.round((data.totalReplied / data.totalSent) * 100) : 0
  const stopped = data.prospects.filter(p => p.stoppedReason).length
  const active = data.prospects.filter(p => !p.stoppedReason).length

  return (
    <div className="space-y-6">

      {/* Breadcrumb + Header */}
      <div className="space-y-3">
        <Link href="/campaigns" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit">
          <ArrowLeft className="h-3.5 w-3.5" />Campagnes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-white">{data.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            {data.description && (
              <p className="text-sm text-white/50">{data.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {data.targetCity && (
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3.5 w-3.5" />{data.targetCity}
                </span>
              )}
              {data.targetIndustry && (
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Tag className="h-3.5 w-3.5" />{data.targetIndustry}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-white/40">
                <TrendingUp className="h-3.5 w-3.5" />Score ≥ {data.minScore}
              </span>
              <span className="text-xs text-white/25">
                Créée {formatDistanceToNow(new Date(data.createdAt), { locale: fr, addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {data.status === 'DRAFT' && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={handleLaunch}
                disabled={actionLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                {actionLoading ? 'Lancement…' : 'Lancer la campagne'}
              </Button>
            )}
            {data.status === 'ACTIVE' && (
              <Button
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => handleStatusChange('PAUSED')}
                disabled={actionLoading}
              >
                <Pause className="h-4 w-4 mr-2" />Pause
              </Button>
            )}
            {data.status === 'PAUSED' && (
              <Button
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={actionLoading}
              >
                <Play className="h-4 w-4 mr-2" />Reprendre
              </Button>
            )}
            {['ACTIVE', 'PAUSED'].includes(data.status) && (
              <Button
                variant="outline"
                className="border-white/10 text-white/50 hover:text-white/70"
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={actionLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />Archiver
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Prospects', value: data.prospectsCount, sub: `${active} actifs · ${stopped} arrêtés`, icon: Users, color: 'bg-indigo-500/15 text-indigo-400' },
          { label: 'Emails envoyés', value: data.totalSent,    sub: 'total séquence',    icon: Mail,          color: 'bg-blue-500/15 text-blue-400' },
          { label: 'Taux ouverture', value: `${openRate}%`,   sub: `${data.totalOpened} ouverts`,  icon: Eye,           color: 'bg-green-500/15 text-green-400' },
          { label: 'Taux réponse',   value: `${replyRate}%`,  sub: `${data.totalReplied} répondus`, icon: MessageSquare, color: 'bg-amber-500/15 text-amber-400' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="bg-[#111218] border-white/8">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${color.split(' ')[0]}`}>
                <Icon className={`h-4 w-4 ${color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xs text-white/50">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/30">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sequence visualization */}
      <Card className="bg-[#111218] border-white/8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-white/80">
            Séquence d&apos;emails
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5 overflow-x-auto">
          <SequenceFlow sequence={data.sequence} />
        </CardContent>
      </Card>

      {/* Prospects table */}
      <Card className="bg-[#111218] border-white/8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Prospects dans la campagne
              <Badge className="bg-white/8 text-white/50 border-0 ml-1">{data.prospectsCount}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.prospects.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="h-8 w-8 text-white/15 mx-auto" />
              <p className="text-white/40 text-sm">
                {data.status === 'DRAFT'
                  ? 'Lancez la campagne pour assigner des prospects automatiquement.'
                  : 'Aucun prospect dans cette campagne.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Prospect', 'Score', 'Statut CRM', 'Progression', 'Dernier email', ''].map(h => (
                      <th key={h} className="text-left text-xs text-white/35 font-medium px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.prospects.map(p => (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      {/* Prospect */}
                      <td className="px-5 py-3">
                        <Link href={`/prospects/${p.id}`} className="hover:text-indigo-300 transition-colors">
                          <p className="font-medium text-white text-sm truncate max-w-[200px]">
                            {p.companyName}
                          </p>
                          <p className="text-xs text-white/40">{p.industry} · {p.city}</p>
                        </Link>
                      </td>

                      {/* Score */}
                      <td className="px-5 py-3">
                        <ScoreCircle score={p.prospectScore} size={32} />
                      </td>

                      {/* Statut CRM */}
                      <td className="px-5 py-3">
                        <span className="text-xs text-white/60">
                          {PROSPECT_STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>

                      {/* Progression dans la séquence */}
                      <td className="px-5 py-3">
                        {p.stoppedReason ? (
                          <StopBadge reason={p.stoppedReason} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <StepBadge step={p.currentStep} total={data.sequence.length} />
                            {/* Mini progress dots */}
                            <div className="flex gap-1">
                              {data.sequence.map((_, si) => (
                                <span
                                  key={si}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    si < p.emailsSentInCampaign
                                      ? 'bg-indigo-400'
                                      : 'bg-white/10'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Dernier email */}
                      <td className="px-5 py-3 text-xs text-white/40">
                        {p.lastEmailAt
                          ? format(new Date(p.lastEmailAt), 'dd MMM', { locale: fr })
                          : '—'}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3">
                        <Link href={`/prospects/${p.id}`}>
                          <Button variant="ghost" size="sm" className="text-white/30 hover:text-indigo-400 h-7 px-2">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info DRAFT */}
      {data.status === 'DRAFT' && (
        <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-300">Campagne en brouillon</p>
            <p className="text-xs text-white/50 mt-1">
              Cliquez sur &quot;Lancer la campagne&quot; pour assigner automatiquement les prospects
              correspondant aux critères (ville, secteur, score ≥ {data.minScore}) et démarrer la séquence.
            </p>
          </div>
        </div>
      )}

      {data.status === 'ACTIVE' && data.prospectsCount > 0 && (
        <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <CalendarCheck className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-300">Campagne active</p>
            <p className="text-xs text-white/50 mt-1">
              La séquence s&apos;exécute automatiquement. Les emails de relance sont envoyés selon les délais
              définis (J+3, J+7). La campagne s&apos;arrête automatiquement si un prospect répond.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
