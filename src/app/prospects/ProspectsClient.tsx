'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, Mail, MoreHorizontal, Star, ExternalLink, Phone, MapPin,
  Building2, X, Trash2, Tag, Send, AlertTriangle, Globe,
  ChevronLeft, ChevronRight, RefreshCw, FileText, ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScoreCircle } from '@/components/prospects/ScoreCircle'
import { toast } from 'sonner'
import type { MockProspect } from '@/lib/mock-prospects'

// ─── Config maps ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:        { label: 'Nouveau',     cls: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  AUDITED:    { label: 'Audité',      cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  CONTACTED:  { label: 'Contacté',    cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  OPENED:     { label: 'Ouvert',      cls: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  REPLIED:    { label: 'Répondu',     cls: 'text-green-400 bg-green-400/10 border-green-400/20' },
  MEETING:    { label: 'RDV',         cls: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  PROPOSAL:   { label: 'Proposition', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  WON:        { label: 'Gagné ✓',    cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  LOST:       { label: 'Perdu',       cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  BLACKLIST:  { label: 'Blacklist',   cls: 'text-red-600 bg-red-600/10 border-red-600/20' },
}

const SOURCE_CFG: Record<string, { label: string; cls: string }> = {
  OPENSTREETMAP: { label: 'OSM',    cls: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  GOOGLE_MAPS:   { label: 'Google', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  MANUAL:        { label: 'Manuel', cls: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  IMPORT_CSV:    { label: 'CSV',    cls: 'text-green-400 bg-green-400/10 border-green-400/20' },
}

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  HOT:    { label: '🔥 HOT',   cls: 'text-red-400' },
  HIGH:   { label: '▲ Haute',  cls: 'text-orange-400' },
  MEDIUM: { label: '● Moyen',  cls: 'text-amber-400' },
  LOW:    { label: '▼ Bas',    cls: 'text-blue-400' },
  COLD:   { label: '❄ Froid', cls: 'text-slate-400' },
}

const ALL_STATUSES = ['NEW','AUDITED','CONTACTED','OPENED','REPLIED','MEETING','PROPOSAL','WON','LOST','BLACKLIST']
const ALL_PRIORITIES = ['HOT','HIGH','MEDIUM','LOW','COLD']
const ALL_SOURCES = ['OPENSTREETMAP','GOOGLE_MAPS','MANUAL','IMPORT_CSV']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return "auj."
  if (d === 1) return 'hier'
  if (d < 7)  return `${d}j`
  if (d < 30) return `${Math.floor(d / 7)}sem`
  if (d < 365) return `${Math.floor(d / 30)}mois`
  return `${Math.floor(d / 365)}an`
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400 text-xs font-medium">
      <Star className="w-3 h-3 fill-amber-400" />{rating.toFixed(1)}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-3 py-3"><Skeleton className="w-4 h-4 rounded" /></td>
      <td className="px-3 py-3"><div className="space-y-1.5"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-2.5 w-20" /></div></td>
      <td className="px-3 py-3"><Skeleton className="h-3 w-24" /></td>
      <td className="px-3 py-3"><Skeleton className="h-3 w-16" /></td>
      <td className="px-3 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="h-3 w-10" /></td>
      <td className="px-3 py-3"><Skeleton className="w-9 h-9 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-3 py-3"><Skeleton className="h-3 w-12" /></td>
      <td className="px-3 py-3"><Skeleton className="h-7 w-16 rounded" /></td>
    </tr>
  )
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIcon({ field, sortBy, sortDir }: { field: string; sortBy: string; sortDir: string }) {
  if (sortBy !== field) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
  return sortDir === 'desc'
    ? <ChevronDown className="w-3.5 h-3.5 text-primary" />
    : <ChevronUp className="w-3.5 h-3.5 text-primary" />
}

// ─── Prospect Detail Sheet ────────────────────────────────────────────────────

function ProspectSheet({
  prospect, open, onClose,
}: { prospect: MockProspect | null; open: boolean; onClose: () => void }) {
  if (!prospect) return null
  const status = STATUS_CFG[prospect.status] ?? STATUS_CFG.NEW
  const priority = PRIORITY_CFG[prospect.priority] ?? PRIORITY_CFG.MEDIUM

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-tight">{prospect.companyName}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{prospect.industry}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className={`text-xs ${status.cls}`}>{status.label}</Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Score + priority */}
        <div className="flex items-center gap-4 py-4 border-y border-border">
          <div className="flex items-center gap-3">
            <ScoreCircle score={prospect.prospectScore} size={52} />
            <div>
              <p className="text-xs text-muted-foreground">Score prospect</p>
              <p className={`text-sm font-semibold ${priority.cls}`}>{priority.label}</p>
            </div>
          </div>
          {prospect.googleRating && (
            <>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="text-xs text-muted-foreground">Note Google</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating rating={prospect.googleRating} />
                  <span className="text-xs text-muted-foreground">({prospect.googleReviewCount})</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Contact info */}
        <div className="py-4 space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
          {(prospect.firstName || prospect.lastName) && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{[prospect.firstName, prospect.lastName].filter(Boolean).join(' ')}</span>
            </div>
          )}
          {prospect.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href={`mailto:${prospect.email}`} className="text-primary hover:underline truncate">
                {prospect.email}
              </a>
            </div>
          )}
          {prospect.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${prospect.phone}`} className="hover:text-primary">{prospect.phone}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>{[prospect.city, prospect.postalCode].filter(Boolean).join(' ')}</span>
          </div>
          {prospect.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a
                href={prospect.website} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline truncate flex items-center gap-1"
              >
                {prospect.website.replace(/^https?:\/\//, '').slice(0, 40)}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
          {!prospect.hasWebsite && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Aucun site web détecté</span>
            </div>
          )}
        </div>

        {/* Audit issues */}
        {prospect.issues && prospect.issues.length > 0 && (
          <>
            <Separator />
            <div className="py-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Problèmes détectés
              </p>
              <div className="space-y-1.5">
                {prospect.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span className="text-muted-foreground">{issue}</span>
                  </div>
                ))}
              </div>
              {prospect.siteScore !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Score site :</span>
                  <ScoreCircle score={prospect.siteScore} size={28} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Activity */}
        <Separator />
        <div className="py-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activité</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Emails', value: prospect.emailsSent },
              { label: 'Notes', value: prospect._count.notes },
              { label: 'Échanges', value: prospect._count.emails },
            ].map(item => (
              <div key={item.label} className="p-2 rounded-lg bg-card border">
                <p className="text-lg font-bold text-primary">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          {prospect.lastContactAt && (
            <p className="text-xs text-muted-foreground">
              Dernier contact : {new Date(prospect.lastContactAt).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href={`/prospects/${prospect.id}`}>
              <Eye className="w-4 h-4" />Voir la fiche complète
            </Link>
          </Button>
          <Button className="w-full gap-2">
            <Mail className="w-4 h-4" />Générer un email IA
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />Notes
            </Button>
            <Button variant="outline" className="gap-2">
              <ClipboardList className="w-4 h-4" />Emails
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

interface Filters {
  search: string
  status: string
  priority: string
  source: string
  scoreMin: number
  scoreMax: number
}

const LIMIT = 20

export function ProspectsClient() {
  const [prospects, setProspects] = useState<MockProspect[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [sortBy, setSortBy]       = useState('prospectScore')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters]     = useState<Filters>({
    search: '', status: '', priority: '', source: '', scoreMin: 0, scoreMax: 100,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sheetProspect, setSheetProspect] = useState<MockProspect | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const router = useRouter()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasActiveFilters = filters.status || filters.priority || filters.source ||
    filters.scoreMin > 0 || filters.scoreMax < 100

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProspects = useCallback(async (opts: {
    p?: number; sort?: string; dir?: SortDir; f?: Filters
  } = {}) => {
    const p = opts.p ?? page
    const by = opts.sort ?? sortBy
    const dir = opts.dir ?? sortDir
    const f = opts.f ?? filters

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(LIMIT),
        sortBy: by, sortDir: dir,
        ...(f.search   && { search: f.search }),
        ...(f.status   && { status: f.status }),
        ...(f.priority && { priority: f.priority }),
        ...(f.source   && { source: f.source }),
        ...(f.scoreMin > 0   && { scoreMin: String(f.scoreMin) }),
        ...(f.scoreMax < 100 && { scoreMax: String(f.scoreMax) }),
      })
      const res = await fetch(`/api/prospects?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProspects(data.prospects)
      setTotal(data.total)
      setSelectedIds(new Set())
    } catch {
      toast.error('Erreur de chargement des prospects')
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortDir, filters])

  useEffect(() => { fetchProspects() }, []) // eslint-disable-line

  // Debounced search
  function handleSearchChange(value: string) {
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchProspects({ p: 1, f: newFilters })
    }, 350)
  }

  function applyFilters(newFilters: Filters) {
    setFilters(newFilters)
    setPage(1)
    fetchProspects({ p: 1, f: newFilters })
  }

  function handleSort(field: string) {
    const newDir: SortDir = sortBy === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortBy(field)
    setSortDir(newDir)
    fetchProspects({ sort: field, dir: newDir })
  }

  function handlePage(newPage: number) {
    setPage(newPage)
    fetchProspects({ p: newPage })
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const allSelected = prospects.length > 0 && prospects.every(p => selectedIds.has(p.id))
  const someSelected = prospects.some(p => selectedIds.has(p.id)) && !allSelected

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(prospects.map(p => p.id)))
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Open sheet ─────────────────────────────────────────────────────────────

  function openSheet(p: MockProspect) {
    setSheetProspect(p)
    setSheetOpen(true)
  }

  const totalPages = Math.ceil(total / LIMIT)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-6 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '…' : `${total} prospect${total !== 1 ? 's' : ''}`}
              {hasActiveFilters && <span className="text-primary"> · filtré</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchProspects()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Actualiser
          </Button>
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher une entreprise, ville, contact…"
              value={filters.search}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {filters.search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            variant={filtersOpen || hasActiveFilters ? 'default' : 'outline'}
            onClick={() => setFiltersOpen(v => !v)}
            className="gap-2 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-bold leading-none">
                {[filters.status, filters.priority, filters.source].filter(Boolean).length +
                  (filters.scoreMin > 0 || filters.scoreMax < 100 ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border bg-card/50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Statut</p>
              <select
                value={filters.status}
                onChange={e => applyFilters({ ...filters, status: e.target.value })}
                className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Tous</option>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            {/* Priority */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Priorité</p>
              <select
                value={filters.priority}
                onChange={e => applyFilters({ ...filters, priority: e.target.value })}
                className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Toutes</option>
                {ALL_PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_CFG[p]?.label ?? p}</option>
                ))}
              </select>
            </div>
            {/* Source */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Source</p>
              <select
                value={filters.source}
                onChange={e => applyFilters({ ...filters, source: e.target.value })}
                className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Toutes</option>
                {ALL_SOURCES.map(s => (
                  <option key={s} value={s}>{SOURCE_CFG[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            {/* Score range */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Score : {filters.scoreMin}–{filters.scoreMax}
              </p>
              <div className="flex gap-2">
                <input
                  type="number" min={0} max={filters.scoreMax} placeholder="Min"
                  value={filters.scoreMin || ''}
                  onChange={e => applyFilters({ ...filters, scoreMin: Number(e.target.value) || 0 })}
                  className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="number" min={filters.scoreMin} max={100} placeholder="Max"
                  value={filters.scoreMax < 100 ? filters.scoreMax : ''}
                  onChange={e => applyFilters({ ...filters, scoreMax: Number(e.target.value) || 100 })}
                  className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {/* Reset */}
            {hasActiveFilters && (
              <div className="col-span-full flex justify-end">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => applyFilters({ search: filters.search, status: '', priority: '', source: '', scoreMin: 0, scoreMax: 100 })}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-card/80">
                {/* Checkbox */}
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </th>
                {/* Entreprise */}
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    Entreprise
                    <SortIcon field="companyName" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                {/* Contact */}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-36">
                  Contact
                </th>
                {/* Ville */}
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center gap-1">
                    Ville<SortIcon field="city" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                {/* Source */}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">
                  Source
                </th>
                {/* Google */}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                  Google
                </th>
                {/* Score */}
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide w-16 cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('prospectScore')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Score<SortIcon field="prospectScore" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                {/* Statut */}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">
                  Statut
                </th>
                {/* Dernière action */}
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('lastContactAt')}
                >
                  <div className="flex items-center gap-1">
                    Action<SortIcon field="lastContactAt" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                {/* Actions */}
                <th className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : prospects.length === 0
                ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Aucun prospect trouvé</p>
                      <p className="text-sm mt-1">Modifiez vos filtres ou lancez une recherche Overpass</p>
                    </td>
                  </tr>
                )
                : prospects.map(prospect => {
                  const isSelected = selectedIds.has(prospect.id)
                  const status = STATUS_CFG[prospect.status] ?? STATUS_CFG.NEW
                  const source = SOURCE_CFG[prospect.source] ?? SOURCE_CFG.OPENSTREETMAP

                  return (
                    <tr
                      key={prospect.id}
                      onClick={() => openSheet(prospect)}
                      className={`border-b border-border/50 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/8'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(prospect.id)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      </td>

                      {/* Entreprise */}
                      <td className="px-3 py-3 max-w-[220px]">
                        <div className="font-medium truncate">{prospect.companyName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">{prospect.industry}</span>
                          {!prospect.hasWebsite && (
                            <span className="text-xs text-red-400 font-medium flex-shrink-0">• sans site</span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3 w-36">
                        {prospect.firstName || prospect.lastName ? (
                          <div>
                            <div className="text-xs truncate">
                              {[prospect.firstName, prospect.lastName].filter(Boolean).join(' ')}
                            </div>
                            {prospect.email && (
                              <div className="text-xs text-muted-foreground truncate">{prospect.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Ville */}
                      <td className="px-3 py-3 w-24">
                        <span className="text-xs">{prospect.city}</span>
                      </td>

                      {/* Source */}
                      <td className="px-3 py-3 w-20">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${source.cls}`}>
                          {source.label}
                        </Badge>
                      </td>

                      {/* Google */}
                      <td className="px-3 py-3 w-24">
                        {prospect.googleRating ? (
                          <div>
                            <StarRating rating={prospect.googleRating} />
                            <div className="text-[10px] text-muted-foreground">
                              {prospect.googleReviewCount} avis
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3 w-16 text-center">
                        <ScoreCircle score={prospect.prospectScore} />
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-3 w-28">
                        <Badge variant="outline" className={`text-xs ${status.cls}`}>
                          {status.label}
                        </Badge>
                      </td>

                      {/* Dernière action */}
                      <td className="px-3 py-3 w-24">
                        <span className="text-xs text-muted-foreground">
                          {relDate(prospect.lastContactAt ?? prospect.createdAt)}
                        </span>
                      </td>

                      {/* Actions rapides */}
                      <td className="px-3 py-3 w-20" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            title="Voir la fiche"
                            onClick={() => router.push(`/prospects/${prospect.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => toast.info('Génération email IA — étape 7')}>
                            <Mail className="w-3.5 h-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openSheet(prospect)}>
                                <Eye className="w-3.5 h-3.5 mr-2" />Voir la fiche
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Génération email — étape 7')}>
                                <Mail className="w-3.5 h-3.5 mr-2" />Générer email IA
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Campagnes — étape 8')}>
                                <Send className="w-3.5 h-3.5 mr-2" />Ajouter à campagne
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Tags — à venir')}>
                                <Tag className="w-3.5 h-3.5 mr-2" />Ajouter tag
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive"
                                onClick={() => toast.error('Nécessite une DB connectée')}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" />Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} sur <strong>{total}</strong> prospects
          </span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8"
              disabled={page === 1} onClick={() => handlePage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pg = i + 1
              return (
                <Button
                  key={pg} size="sm" variant={page === pg ? 'default' : 'outline'}
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => handlePage(pg)}
                >
                  {pg}
                </Button>
              )
            })}
            {totalPages > 5 && <span className="text-muted-foreground text-xs px-1">…</span>}
            <Button size="icon" variant="outline" className="h-8 w-8"
              disabled={page === totalPages} onClick={() => handlePage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ─────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-semibold text-primary">{selectedIds.size} sélectionné(s)</span>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" variant="outline" className="gap-1.5 h-8"
            onClick={() => toast.info('Changement de statut en masse — à venir')}>
            <Tag className="w-3.5 h-3.5" />Changer statut
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8"
            onClick={() => toast.info('Ajout à campagne — étape 8')}>
            <Send className="w-3.5 h-3.5" />Campagne
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 h-8"
            onClick={() => toast.error('Suppression — nécessite une DB connectée')}>
            <Trash2 className="w-3.5 h-3.5" />Supprimer
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 ml-1"
            onClick={() => setSelectedIds(new Set())}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Prospect Sheet ──────────────────────────────────────────────────── */}
      <ProspectSheet prospect={sheetProspect} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
