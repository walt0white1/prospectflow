'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, MapPin, Loader2, CheckCircle2, AlertCircle,
  Globe, Phone, Mail, ExternalLink, Star, ChevronDown,
  RefreshCw, Download, Save, Filter, Wifi, WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { SECTORS } from '@/lib/sectors'
import type { ScoredProspect } from '@/lib/scoring'

// ── Types SSE ─────────────────────────────────────────────────────────────────

type SSEStatus = {
  step: 'geocode' | 'overpass' | 'scoring' | 'enrich'
  message: string
}

type SearchState =
  | { phase: 'idle' }
  | { phase: 'searching'; message: string; progress: number }
  | { phase: 'enriching'; message: string; progress: number; enrichProgress: number; enrichTotal: number }
  | { phase: 'done'; results: ScoredProspect[]; geocodedCity: string }
  | { phase: 'error'; message: string }

// ── Score utils ────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'text-red-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-amber-400'
  if (score >= 20) return 'text-indigo-400'
  return 'text-zinc-500'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-red-500/10 border-red-500/20'
  if (score >= 60) return 'bg-orange-500/10 border-orange-500/20'
  if (score >= 40) return 'bg-amber-500/10 border-amber-500/20'
  if (score >= 20) return 'bg-indigo-500/10 border-indigo-500/20'
  return 'bg-zinc-800/50 border-zinc-700/30'
}

function priorityBadgeVariant(priority: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (priority) {
    case 'HOT': return 'destructive'
    case 'HIGH': return 'default'
    case 'MEDIUM': return 'secondary'
    default: return 'outline'
  }
}

function priorityLabel(priority: string): string {
  switch (priority) {
    case 'HOT': return '🔥 HOT'
    case 'HIGH': return '⬆ HIGH'
    case 'MEDIUM': return '→ MEDIUM'
    case 'LOW': return '⬇ LOW'
    case 'COLD': return '❄ COLD'
    default: return priority
  }
}

// ── Score Circle (SVG) ────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 20
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80 ? '#ef4444'
    : score >= 60 ? '#f97316'
    : score >= 40 ? '#f59e0b'
    : score >= 20 ? '#6366f1'
    : '#71717a'

  return (
    <svg width={52} height={52} className="shrink-0">
      <circle cx={26} cy={26} r={r} fill="none" stroke="#27272a" strokeWidth={5} />
      <circle
        cx={26} cy={26} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text
        x={26} y={26}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill={color}
      >
        {score}
      </text>
    </svg>
  )
}

// ── Prospect Card ─────────────────────────────────────────────────────────────

function ProspectCard({
  prospect,
  onSave,
  saved,
}: {
  prospect: ScoredProspect
  onSave: (p: ScoredProspect) => void
  saved: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-lg border p-4 transition-all ${scoreBg(prospect.prospectScore)}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <ScoreCircle score={prospect.prospectScore} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{prospect.name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {prospect.industry} · {prospect.city}
                {prospect.address && <span> · {prospect.address}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={priorityBadgeVariant(prospect.priority)} className="text-xs">
                {priorityLabel(prospect.priority)}
              </Badge>
            </div>
          </div>

          {/* Indicateurs rapides */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            {prospect.hasWebsite ? (
              <span className="flex items-center gap-1 text-zinc-400">
                <Wifi className="h-3 w-3 text-green-500" />
                Site web
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 font-medium">
                <WifiOff className="h-3 w-3" />
                Pas de site
              </span>
            )}

            {prospect.phone && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Phone className="h-3 w-3" />
                {prospect.phone}
              </span>
            )}

            {prospect.googleRating && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="h-3 w-3 fill-amber-400" />
                {prospect.googleRating.toFixed(1)}
                {prospect.googleReviewCount && (
                  <span className="text-zinc-400">({prospect.googleReviewCount})</span>
                )}
              </span>
            )}
          </div>

          {/* Issues */}
          {prospect.issues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {prospect.issues.slice(0, expanded ? undefined : 2).map((issue, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  {issue}
                </span>
              ))}
              {!expanded && prospect.issues.length > 2 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-400 border border-zinc-700 hover:bg-zinc-700"
                >
                  +{prospect.issues.length - 2} autres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50">
        <div className="flex items-center gap-2">
          {prospect.website && (
            <a
              href={prospect.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Visiter le site
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <Mail className="h-3 w-3" />
              Email
            </a>
          )}
          {/* Lien Google Maps */}
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${prospect.name} ${prospect.city}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <MapPin className="h-3 w-3" />
            Maps
          </a>
        </div>

        <Button
          size="sm"
          variant={saved ? 'secondary' : 'default'}
          className="h-7 text-xs"
          onClick={() => onSave(prospect)}
          disabled={saved}
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sauvegardé
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Ajouter au CRM
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SearchClient() {
  const router = useRouter()

  // Form state
  const [sectorValue, setSectorValue] = useState<string>('')
  const [city, setCity] = useState('')
  const [radiusKm, setRadiusKm] = useState(5)
  const [limit, setLimit] = useState(30)
  const [enrichGmaps, setEnrichGmaps] = useState(false)

  // Search state
  const [searchState, setSearchState] = useState<SearchState>({ phase: 'idle' })

  // Filter state
  const [filterHasNoSite, setFilterHasNoSite] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState(0)

  // Saved prospects
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // SSE reader ref (for abort)
  const abortRef = useRef<AbortController | null>(null)

  // ── Filtered results ─────────────────────────────────────────────────────────

  const allResults = searchState.phase === 'done' ? searchState.results : []
  const filteredResults = allResults.filter(p => {
    if (filterHasNoSite && p.hasWebsite) return false
    if (p.prospectScore < filterMinScore) return false
    return true
  })

  // ── Search handler ───────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!sectorValue || !city.trim()) {
      toast.error('Veuillez sélectionner un secteur et saisir une ville.')
      return
    }

    // Annuler une recherche en cours
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    setSearchState({ phase: 'searching', message: 'Initialisation…', progress: 10 })

    try {
      const res = await fetch('/api/prospects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: sectorValue, city: city.trim(), radiusKm, limit, enrichGmaps }),
        signal: abort.signal,
      })

      if (!res.body) throw new Error('Pas de corps de réponse')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let geocodedCity = city

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice('event: '.length).trim()
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice('data: '.length)
            try {
              const data = JSON.parse(rawData)

              switch (currentEvent) {
                case 'status': {
                  const status = data as SSEStatus
                  const progressMap = { geocode: 20, overpass: 40, scoring: 60, enrich: 70 }
                  setSearchState(prev => ({
                    phase: 'searching',
                    message: status.message,
                    progress: progressMap[status.step] ?? (prev.phase === 'searching' ? prev.progress : 20),
                  }))
                  break
                }
                case 'geocode':
                  geocodedCity = data.city ?? city
                  setSearchState(prev => ({
                    ...prev,
                    phase: 'searching',
                    message: `Ville trouvée : ${data.displayName}`,
                    progress: 30,
                  } as SearchState))
                  break

                case 'overpass':
                  setSearchState(prev => ({
                    ...prev,
                    phase: 'searching',
                    message: `${data.count} lieux trouvés sur OpenStreetMap`,
                    progress: 55,
                  } as SearchState))
                  break

                case 'scored':
                  setSearchState(prev => ({
                    ...prev,
                    phase: 'searching',
                    message: 'Scoring en cours…',
                    progress: 70,
                  } as SearchState))
                  break

                case 'enrich': {
                  const { index, total, name } = data as { index: number; total: number; name: string }
                  setSearchState(prev => ({
                    phase: 'enriching',
                    message: `Enrichissement Google Maps : ${name}`,
                    progress: 70 + (index / total) * 25,
                    enrichProgress: index,
                    enrichTotal: total,
                  }))
                  break
                }

                case 'done':
                  setSearchState({
                    phase: 'done',
                    results: data as ScoredProspect[],
                    geocodedCity,
                  })
                  break

                case 'error':
                  setSearchState({ phase: 'error', message: data.message ?? 'Erreur inconnue' })
                  break
              }
            } catch {
              // Ligne SSE non parseable — ignorer
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setSearchState({ phase: 'error', message: (err as Error).message })
    }
  }, [sectorValue, city, radiusKm, limit, enrichGmaps])

  // ── Save to CRM ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async (prospect: ScoredProspect) => {
    try {
      const body = {
        companyName: prospect.name,
        industry: prospect.industry,
        city: prospect.city,
        website: prospect.website ?? undefined,
        hasWebsite: prospect.hasWebsite,
        phone: prospect.phone ?? undefined,
        email: prospect.email ?? undefined,
        address: prospect.address ?? undefined,
        lat: prospect.lat,
        lng: prospect.lng,
        osmId: prospect.osmId,
        prospectScore: prospect.prospectScore,
        priority: prospect.priority,
        source: 'OPENSTREETMAP',
        issues: prospect.issues,
        googleRating: prospect.googleRating ?? undefined,
        googleReviewCount: prospect.googleReviewCount ?? undefined,
      }

      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSavedIds(prev => new Set([...prev, prospect.osmId]))
        toast.success(`${prospect.name} ajouté au CRM !`, {
          action: {
            label: 'Voir',
            onClick: () => router.push('/prospects'),
          },
        })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Impossible de contacter le serveur')
    }
  }, [router])

  // ── Save all visible ─────────────────────────────────────────────────────────

  const handleSaveAll = useCallback(async () => {
    const unsaved = filteredResults.filter(p => !savedIds.has(p.osmId))
    if (unsaved.length === 0) {
      toast.info('Tous les résultats sont déjà sauvegardés')
      return
    }
    toast.info(`Sauvegarde de ${unsaved.length} prospects…`)
    for (const p of unsaved) {
      await handleSave(p)
    }
  }, [filteredResults, savedIds, handleSave])

  // ── Render ────────────────────────────────────────────────────────────────────

  const isSearching =
    searchState.phase === 'searching' || searchState.phase === 'enriching'

  const progress =
    searchState.phase === 'searching'
      ? searchState.progress
      : searchState.phase === 'enriching'
        ? searchState.progress
        : 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Formulaire de recherche ─────────────────────────────────────────── */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-400" />
            Recherche de prospects
          </CardTitle>
          <CardDescription>
            Trouve des entreprises locales via OpenStreetMap — 100% gratuit, sans clé API.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Secteur */}
            <div className="space-y-1.5">
              <Label>Secteur d&apos;activité</Label>
              <Select value={sectorValue} onValueChange={setSectorValue}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Choisir un secteur…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 max-h-64">
                  {SECTORS.map(s => (
                    <SelectItem key={s.osmValue} value={s.osmValue}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ville */}
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Lyon, Paris, Bordeaux…"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isSearching && handleSearch()}
                  className="pl-9 bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            {/* Rayon */}
            <div className="space-y-1.5">
              <Label>Rayon : <span className="text-indigo-400 font-semibold">{radiusKm} km</span></Label>
              <div className="flex items-center gap-3 pt-2">
                <Slider
                  min={1}
                  max={25}
                  step={1}
                  value={[radiusKm]}
                  onValueChange={([v]) => setRadiusKm(v)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Limite */}
            <div className="space-y-1.5">
              <Label>Résultats max : <span className="text-indigo-400 font-semibold">{limit}</span></Label>
              <div className="flex items-center gap-3 pt-2">
                <Slider
                  min={10}
                  max={100}
                  step={5}
                  value={[limit]}
                  onValueChange={([v]) => setLimit(v)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Option enrichissement GMaps */}
          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <Switch
              id="enrich-gmaps"
              checked={enrichGmaps}
              onCheckedChange={setEnrichGmaps}
            />
            <div>
              <Label htmlFor="enrich-gmaps" className="cursor-pointer">
                Enrichissement Google Maps
              </Label>
              <p className="text-xs text-zinc-400 mt-0.5">
                Récupère les notes Google, avis et téléphone via Playwright.
                Plus lent (2–4s/prospect) mais données plus riches.
              </p>
            </div>
          </div>

          {/* Bouton lancer */}
          <div className="mt-4">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !sectorValue || !city.trim()}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500"
              size="lg"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recherche en cours…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Lancer la recherche
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Barre de progression ────────────────────────────────────────────── */}
      {isSearching && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  {searchState.phase === 'searching'
                    ? searchState.message
                    : searchState.message}
                </span>
                <span className="text-zinc-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />

              {searchState.phase === 'enriching' && (
                <p className="text-xs text-zinc-400">
                  Enrichissement Google Maps : {searchState.enrichProgress} / {searchState.enrichTotal}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {searchState.phase === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erreur de recherche</p>
            <p className="text-sm text-red-400/80 mt-1">{searchState.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearch}
              className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* ── Résultats ────────────────────────────────────────────────────────── */}
      {searchState.phase === 'done' && (
        <div className="space-y-4">
          {/* En-tête résultats */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {filteredResults.length} résultats
                {filteredResults.length !== allResults.length && (
                  <span className="text-zinc-400 font-normal"> (sur {allResults.length})</span>
                )}
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                {SECTORS.find(s => s.osmValue === sectorValue)?.label} à {searchState.geocodedCity}
                {' · '}Rayon {radiusKm} km
                {' · '}Triés par score décroissant
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Relancer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAll}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Tout sauvegarder
              </Button>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Filter className="h-3.5 w-3.5" />
              Filtres :
            </div>
            <button
              onClick={() => setFilterHasNoSite(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterHasNoSite
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <WifiOff className="h-3 w-3 inline mr-1.5" />
              Sans site web
            </button>
            <button
              onClick={() => setFilterMinScore(filterMinScore === 0 ? 60 : 0)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterMinScore >= 60
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              Score ≥ 60
            </button>
            <button
              onClick={() => setFilterMinScore(filterMinScore === 0 ? 80 : 0)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterMinScore >= 80
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              🔥 HOT uniquement
            </button>

            {/* Stats rapides */}
            <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
              <span>
                🔥 {allResults.filter(p => p.priority === 'HOT').length} HOT
              </span>
              <span>
                <WifiOff className="h-3 w-3 inline mr-0.5" />
                {allResults.filter(p => !p.hasWebsite).length} sans site
              </span>
            </div>
          </div>

          {/* Cards */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>Aucun résultat ne correspond aux filtres actifs</p>
              <button
                onClick={() => { setFilterHasNoSite(false); setFilterMinScore(0) }}
                className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredResults.map(prospect => (
                <ProspectCard
                  key={prospect.osmId}
                  prospect={prospect}
                  onSave={handleSave}
                  saved={savedIds.has(prospect.osmId)}
                />
              ))}
            </div>
          )}

          {/* Empty state si 0 résultats totaux */}
          {allResults.length === 0 && (
            <div className="text-center py-16">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
              <h3 className="text-zinc-300 font-medium">Aucun résultat trouvé</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                OpenStreetMap n&apos;a pas de données pour ce secteur dans cette zone.
                Essayez un rayon plus large ou une ville différente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── État idle ────────────────────────────────────────────────────────── */}
      {searchState.phase === 'idle' && (
        <div className="text-center py-16 text-zinc-600">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-zinc-400 font-medium mb-1">Prêt à chercher</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Sélectionne un secteur d&apos;activité et une ville, puis lance la recherche.
            Les données proviennent d&apos;OpenStreetMap — 100% gratuit.
          </p>
        </div>
      )}
    </div>
  )
}
