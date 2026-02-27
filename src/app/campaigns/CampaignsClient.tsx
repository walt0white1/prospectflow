'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, Play, Pause, CheckCircle, FileText,
  MapPin, Tag, TrendingUp, Mail, Eye, MessageSquare,
  CalendarCheck, Users, RefreshCw, Zap, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SECTORS } from '@/lib/sectors'
import type { MockCampaign, CampaignStatus, SequenceStep } from '@/lib/mock-campaigns'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Brouillon', color: 'bg-white/8 text-white/50 border-white/10',         icon: FileText },
  ACTIVE:    { label: 'Active',    color: 'bg-green-500/15 text-green-400 border-green-500/25',icon: Play },
  PAUSED:    { label: 'En pause',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/25',icon: Pause },
  COMPLETED: { label: 'Terminée', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25',   icon: CheckCircle },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, color, icon: Icon } = STATUS_CONFIG[status]
  return (
    <Badge className={`${color} border text-xs font-medium flex items-center gap-1 w-fit`}>
      {status === 'ACTIVE' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {status !== 'ACTIVE' && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  )
}

// ── Open rate bar ─────────────────────────────────────────────────────────────

function RateBar({ sent, opened }: { sent: number; opened: number }) {
  const pct = sent > 0 ? Math.round((opened / sent) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/40">
        <span>Taux d&apos;ouverture</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Sequence preview (compact) ────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  FIRST_CONTACT: '1er contact',
  FOLLOW_UP_1:   'Relance',
  FOLLOW_UP_2:   'Relance 2',
  FOLLOW_UP_3:   'Relance 3',
}

function SequencePreview({ sequence }: { sequence: SequenceStep[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {sequence.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-white/5 rounded px-2 py-0.5">
            <span className="text-[10px] text-white/50 font-mono">
              J+{step.delay}
            </span>
            <span className="text-[10px] text-white/70">{STEP_LABELS[step.type] ?? step.label}</span>
          </div>
          {i < sequence.length - 1 && (
            <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Campaign card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onStatusChange,
}: {
  campaign: MockCampaign
  onStatusChange: (id: string, status: CampaignStatus) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleLaunch = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/launch`, { method: 'POST' })
      const data = await res.json() as { message: string; count: number }
      toast.success(data.message)
      onStatusChange(campaign.id, 'ACTIVE')
    } catch {
      toast.error('Erreur lors du lancement')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePause = async (e: React.MouseEvent) => {
    e.preventDefault()
    const newStatus: CampaignStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onStatusChange(campaign.id, newStatus)
      toast.success(newStatus === 'ACTIVE' ? 'Campagne reprise' : 'Campagne mise en pause')
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="bg-[#111218] border-white/8 hover:border-indigo-500/30 transition-colors group cursor-pointer h-full">
        <CardContent className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                {campaign.name}
              </p>
              {campaign.description && (
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{campaign.description}</p>
              )}
            </div>
            <StatusBadge status={campaign.status} />
          </div>

          {/* Target tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {campaign.targetCity && (
              <span className="flex items-center gap-1 text-[11px] text-white/50 bg-white/5 rounded-full px-2 py-0.5">
                <MapPin className="h-3 w-3" />{campaign.targetCity}
              </span>
            )}
            {campaign.targetIndustry && (
              <span className="flex items-center gap-1 text-[11px] text-white/50 bg-white/5 rounded-full px-2 py-0.5">
                <Tag className="h-3 w-3" />{campaign.targetIndustry}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-white/50 bg-white/5 rounded-full px-2 py-0.5">
              <TrendingUp className="h-3 w-3" />Score ≥ {campaign.minScore}
            </span>
          </div>

          {/* Séquence */}
          <SequencePreview sequence={campaign.sequence} />

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: Users,         value: campaign.prospectsCount, label: 'Prospects', color: 'text-white/70' },
              { icon: Mail,          value: campaign.totalSent,      label: 'Envoyés',   color: 'text-blue-400' },
              { icon: Eye,           value: campaign.totalOpened,    label: 'Ouverts',   color: 'text-green-400' },
              { icon: MessageSquare, value: campaign.totalReplied,   label: 'Répondus',  color: 'text-amber-400' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="bg-white/3 rounded-lg py-2">
                <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${color}`} />
                <p className="text-sm font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/35">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {campaign.totalSent > 0 && (
            <RateBar sent={campaign.totalSent} opened={campaign.totalOpened} />
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1" onClick={e => e.preventDefault()}>
            {campaign.status === 'DRAFT' && (
              <Button
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7"
                onClick={handleLaunch}
                disabled={loading}
              >
                <Zap className="h-3 w-3 mr-1.5" />
                {loading ? 'Lancement…' : 'Lancer'}
              </Button>
            )}
            {campaign.status === 'ACTIVE' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-amber-400 hover:border-amber-500/30 text-xs h-7"
                onClick={handleTogglePause}
              >
                <Pause className="h-3 w-3 mr-1.5" />Pause
              </Button>
            )}
            {campaign.status === 'PAUSED' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-green-400 hover:border-green-500/30 text-xs h-7"
                onClick={handleTogglePause}
              >
                <Play className="h-3 w-3 mr-1.5" />Reprendre
              </Button>
            )}
            <span className="text-[10px] text-white/25 ml-auto">
              {formatDistanceToNow(new Date(campaign.updatedAt), { locale: fr, addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

const DEFAULT_SEQUENCE = [
  { step: 0, delay: 0, type: 'FIRST_CONTACT', label: 'Premier contact' },
  { step: 1, delay: 3, type: 'FOLLOW_UP_1',   label: 'Relance J+3' },
  { step: 2, delay: 7, type: 'FOLLOW_UP_2',   label: 'Relance J+7' },
]

function CreateDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (c: MockCampaign) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [industry, setIndustry] = useState('')
  const [minScore, setMinScore] = useState(60)
  const [maxProspects, setMaxProspects] = useState('50')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(''); setDescription(''); setCity(''); setIndustry('')
    setMinScore(60); setMaxProspects('50')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Le nom est obligatoire'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description: description || null,
          targetCity: city || null,
          targetIndustry: industry || null,
          minScore, maxProspects: Number(maxProspects),
        }),
      })
      const data = await res.json() as { campaign: MockCampaign }
      onCreate({ ...data.campaign, sequence: DEFAULT_SEQUENCE as SequenceStep[] })
      toast.success('Campagne créée !')
      handleClose()
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="bg-[#111218] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Nouvelle campagne</DialogTitle>
          <DialogDescription className="text-white/50">
            Définissez la cible et la séquence d&apos;emails automatiques.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nom de la campagne *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Coiffeurs Lyon sans site"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Description (optionnel)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Objectif de la campagne…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
          </div>

          {/* Cible : ville + secteur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Ville cible</Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Lyon"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Secteur</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Tous secteurs" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1b23] border-white/10">
                  <SelectItem value="" className="text-white/60">Tous secteurs</SelectItem>
                  {SECTORS.map(s => (
                    <SelectItem key={s.osmValue} value={s.label} className="text-white hover:bg-white/5">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Score min */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-white/70 text-xs">Score minimum</Label>
              <span className="text-xs font-semibold text-indigo-400">{minScore}</span>
            </div>
            <Slider
              value={[minScore]}
              onValueChange={([v]) => setMinScore(v)}
              min={0} max={100} step={5}
              className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-400"
            />
            <p className="text-[10px] text-white/35">
              Seuls les prospects avec score ≥ {minScore} seront inclus.
            </p>
          </div>

          {/* Max prospects */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nombre max de prospects</Label>
            <Select value={maxProspects} onValueChange={setMaxProspects}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1b23] border-white/10">
                {['10', '25', '50', '100'].map(n => (
                  <SelectItem key={n} value={n} className="text-white hover:bg-white/5">
                    {n} prospects max
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Séquence fixe */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs">Séquence d&apos;emails</Label>
            <div className="bg-white/3 rounded-lg p-3 space-y-2">
              {DEFAULT_SEQUENCE.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-mono text-indigo-400">J+{step.delay}</span>
                  <span className="text-white/70">{step.label}</span>
                  {step.delay === 0 && (
                    <span className="ml-auto text-white/30">Envoi immédiat</span>
                  )}
                </div>
              ))}
              <div className="border-t border-white/5 pt-2 mt-1 text-[10px] text-white/30 space-y-1">
                <p>⚡ Arrêt automatique si réponse détectée (webhook Brevo)</p>
                <p>🚫 Arrêt si prospect blacklisté · Max 3 emails par prospect</p>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-white/60 hover:text-white"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={saving}
            >
              {saving ? 'Création…' : 'Créer la campagne'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<MockCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json() as { campaigns: MockCampaign[] }
        setCampaigns(data.campaigns)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (id: string, status: CampaignStatus) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const handleCreate = (campaign: MockCampaign) => {
    setCampaigns(prev => [campaign, ...prev])
  }

  // Stats rapides
  const stats = {
    active:    campaigns.filter(c => c.status === 'ACTIVE').length,
    paused:    campaigns.filter(c => c.status === 'PAUSED').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
    draft:     campaigns.filter(c => c.status === 'DRAFT').length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-white/5 animate-pulse rounded" />
          <div className="h-9 w-40 bg-white/5 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Campagnes</h1>
            <p className="text-sm text-white/40">Séquences d&apos;emails automatisées</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="border-white/10 text-white/60 hover:text-white h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-9"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />Nouvelle campagne
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm">
          {[
            { label: 'Actives',   value: stats.active,    color: 'text-green-400' },
            { label: 'En pause',  value: stats.paused,    color: 'text-amber-400' },
            { label: 'Terminées', value: stats.completed, color: 'text-blue-400' },
            { label: 'Brouillon', value: stats.draft,     color: 'text-white/50' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`font-bold text-base ${color}`}>{value}</span>
              <span className="text-white/40">{label}</span>
            </div>
          ))}
          <span className="text-white/20 ml-auto text-xs">
            {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''} au total
          </span>
        </div>

        {/* Grid */}
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="p-4 bg-white/5 rounded-full">
              <CalendarCheck className="h-8 w-8 text-white/20" />
            </div>
            <div>
              <p className="text-white/50 font-medium">Aucune campagne</p>
              <p className="text-white/30 text-sm mt-1">Créez votre première séquence d&apos;emails automatisée.</p>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />Créer une campagne
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      <CreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
