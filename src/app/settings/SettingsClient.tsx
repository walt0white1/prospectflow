'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  User, Mail, Brain, SlidersHorizontal, FileText,
  Eye, EyeOff, CheckCircle2, XCircle, Loader2, Plus,
  Pencil, Trash2, Save, Key, Building2, Phone, AlertTriangle,
  FlaskConical, Zap, Copy, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string
  email: string
  company: string
  phone: string
  signature: string
}

interface BrevoSettings {
  apiKey: string
  fromEmail: string
  fromName: string
}

interface AnthropicSettings {
  apiKey: string
}

interface LimitsSettings {
  dailyEmailLimit: number
  delayBetweenEmails: number
  defaultCity: string
  defaultIndustry: string
  defaultSearchRadius: number
  autoAudit: boolean
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = [
  { value: 'FIRST_CONTACT', label: 'Premier contact' },
  { value: 'FOLLOW_UP_1', label: 'Relance 1' },
  { value: 'FOLLOW_UP_2', label: 'Relance 2' },
  { value: 'FOLLOW_UP_3', label: 'Relance 3' },
  { value: 'AUDIT_REPORT', label: "Rapport d'audit" },
  { value: 'PROPOSAL', label: 'Proposition commerciale' },
  { value: 'CUSTOM', label: 'Personnalisé' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LabelText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-foreground mb-1.5">{children}</p>
}

function HintText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dbConnected, setDbConnected] = useState(false)

  const [profile, setProfile] = useState<UserProfile>({
    name: '', email: '', company: '', phone: '', signature: '',
  })
  const [brevo, setBrevo] = useState<BrevoSettings>({
    apiKey: '', fromEmail: '', fromName: '',
  })
  const [anthropic, setAnthropic] = useState<AnthropicSettings>({ apiKey: '' })
  const [limits, setLimits] = useState<LimitsSettings>({
    dailyEmailLimit: 50, delayBetweenEmails: 30,
    defaultCity: '', defaultIndustry: '', defaultSearchRadius: 15, autoAudit: true,
  })

  const [showBrevoKey, setShowBrevoKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [testingBrevo, setTestingBrevo] = useState(false)
  const [testingAnthropic, setTestingAnthropic] = useState(false)
  const [brevoStatus, setBrevoStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [anthropicStatus, setAnthropicStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateDialog, setTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '', subject: '', body: '', type: 'FIRST_CONTACT',
  })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    loadTemplates()
  }, [])

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setDbConnected(true)
        if (data.profile) setProfile(data.profile)
        if (data.brevo) setBrevo(data.brevo)
        if (data.anthropic) setAnthropic(data.anthropic)
        if (data.limits) setLimits(data.limits)
      } else {
        setDbConnected(false)
      }
    } catch {
      setDbConnected(false)
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplates() {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/settings/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } catch {
      // no-op
    } finally {
      setLoadingTemplates(false)
    }
  }

  // ── Save all ──────────────────────────────────────────────────────────────

  async function handleSaveAll() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, brevo, anthropic, limits }),
      })
      if (res.ok) {
        setDbConnected(true)
        toast.success('Paramètres enregistrés', {
          description: 'Vos paramètres ont été sauvegardés avec succès.',
        })
      } else {
        const err = await res.json()
        toast.error('Erreur de sauvegarde', {
          description: err.message ?? 'Impossible de sauvegarder.',
        })
      }
    } catch {
      toast.error('Erreur de connexion', {
        description: 'Base de données non configurée. Ajoutez DATABASE_URL à votre .env.',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Test connections ───────────────────────────────────────────────────────

  async function handleTestBrevo() {
    if (!brevo.apiKey) {
      toast.error('Clé API manquante', { description: 'Entrez votre clé API Brevo.' })
      return
    }
    setTestingBrevo(true)
    setBrevoStatus('idle')
    try {
      const res = await fetch('/api/settings/test-brevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: brevo.apiKey }),
      })
      if (res.ok) {
        const data = await res.json()
        setBrevoStatus('ok')
        toast.success('Connexion Brevo OK ✓', {
          description: `Compte connecté : ${data.email ?? ''}`,
        })
      } else {
        setBrevoStatus('error')
        toast.error('Connexion Brevo échouée', {
          description: 'Vérifiez votre clé API Brevo.',
        })
      }
    } catch {
      setBrevoStatus('error')
      toast.error('Erreur réseau')
    } finally {
      setTestingBrevo(false)
    }
  }

  async function handleTestAnthropic() {
    if (!anthropic.apiKey) {
      toast.error('Clé API manquante', { description: 'Entrez votre clé API Anthropic.' })
      return
    }
    setTestingAnthropic(true)
    setAnthropicStatus('idle')
    try {
      const res = await fetch('/api/settings/test-anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: anthropic.apiKey }),
      })
      if (res.ok) {
        setAnthropicStatus('ok')
        toast.success('API Claude opérationnelle ✓', {
          description: 'Votre clé Anthropic est valide.',
        })
      } else {
        setAnthropicStatus('error')
        toast.error('Clé Anthropic invalide', {
          description: 'Vérifiez votre clé sur console.anthropic.com.',
        })
      }
    } catch {
      setAnthropicStatus('error')
      toast.error('Erreur réseau')
    } finally {
      setTestingAnthropic(false)
    }
  }

  // ── Templates CRUD ────────────────────────────────────────────────────────

  function openNewTemplate() {
    setEditingTemplate(null)
    setTemplateForm({ name: '', subject: '', body: '', type: 'FIRST_CONTACT' })
    setTemplateDialog(true)
  }

  function openEditTemplate(tpl: EmailTemplate) {
    setEditingTemplate(tpl)
    setTemplateForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, type: tpl.type })
    setTemplateDialog(true)
  }

  async function handleSaveTemplate() {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Champs requis', { description: 'Remplissez le nom, le sujet et le corps.' })
      return
    }
    setSavingTemplate(true)
    try {
      const method = editingTemplate ? 'PUT' : 'POST'
      const url = editingTemplate
        ? `/api/settings/templates/${editingTemplate.id}`
        : '/api/settings/templates'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      })
      if (res.ok) {
        toast.success(editingTemplate ? 'Template mis à jour' : 'Template créé')
        setTemplateDialog(false)
        await loadTemplates()
      } else {
        toast.error('Erreur', { description: 'Impossible de sauvegarder le template.' })
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/settings/templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Template supprimé')
        setTemplates(prev => prev.filter(t => t.id !== id))
      } else {
        toast.error('Erreur', { description: 'Impossible de supprimer.' })
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clés API, profil expéditeur, limites d&apos;envoi et templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <Badge
              variant="outline"
              className={
                dbConnected
                  ? 'text-green-400 border-green-400/40 bg-green-400/10'
                  : 'text-amber-400 border-amber-400/40 bg-amber-400/10'
              }
            >
              {dbConnected ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" />DB connectée</>
              ) : (
                <><AlertTriangle className="w-3 h-3 mr-1" />DB non configurée</>
              )}
            </Badge>
          )}
          <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : 'Enregistrer tout'}
          </Button>
        </div>
      </div>

      {/* ── DB warning banner ──────────────────────────────────────────────── */}
      {!loading && !dbConnected && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-400/30 bg-amber-400/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Base de données non connectée</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Créez votre projet Supabase et ajoutez <code className="px-1 py-0.5 rounded bg-background text-primary">DATABASE_URL</code> dans{' '}
              <code className="px-1 py-0.5 rounded bg-background text-primary">.env.local</code>, puis lancez{' '}
              <code className="px-1 py-0.5 rounded bg-background text-primary">npx prisma migrate dev</code>.
              L&apos;UI est pleinement fonctionnelle et les données seront persistées dès la connexion établie.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="profil" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profil" className="gap-1.5 text-xs sm:text-sm">
            <User className="w-3.5 h-3.5" />Profil
          </TabsTrigger>
          <TabsTrigger value="brevo" className="gap-1.5 text-xs sm:text-sm">
            <Mail className="w-3.5 h-3.5" />Brevo
          </TabsTrigger>
          <TabsTrigger value="anthropic" className="gap-1.5 text-xs sm:text-sm">
            <Brain className="w-3.5 h-3.5" />Anthropic
          </TabsTrigger>
          <TabsTrigger value="limites" className="gap-1.5 text-xs sm:text-sm">
            <SlidersHorizontal className="w-3.5 h-3.5" />Limites
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5" />Templates
          </TabsTrigger>
        </TabsList>

        {/* ═══ PROFIL ═══════════════════════════════════════════════════════ */}
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profil expéditeur
              </CardTitle>
              <CardDescription>
                Ces informations apparaissent dans vos emails de prospection et votre signature.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>Nom complet</LabelText>
                  <Input
                    placeholder="Jean Dupont"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <LabelText>Email de connexion</LabelText>
                  <Input
                    type="email"
                    placeholder="jean@monagence.fr"
                    value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>Entreprise</LabelText>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Mon Agence Web"
                      value={profile.company}
                      onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <LabelText>Téléphone</LabelText>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="+33 6 12 34 56 78"
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <LabelText>Signature email</LabelText>
                <Textarea
                  placeholder={`Cordialement,\nJean Dupont\nMon Agence Web — +33 6 12 34 56 78\nhttps://monagence.fr`}
                  value={profile.signature}
                  onChange={e => setProfile(p => ({ ...p, signature: e.target.value }))}
                  rows={5}
                  className="font-mono text-sm resize-none"
                />
                <HintText>
                  Variables disponibles&nbsp;: {'{prenom}'}, {'{entreprise}'}, {'{ville}'}
                </HintText>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ BREVO ════════════════════════════════════════════════════════ */}
        <TabsContent value="brevo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Configuration Brevo
              </CardTitle>
              <CardDescription>
                Brevo (ex Sendinblue) — envoi transactionnel avec tracking. Plan gratuit : 300 emails/jour.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* API Key */}
              <div>
                <LabelText>
                  <span className="inline-flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />Clé API Brevo
                  </span>
                </LabelText>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showBrevoKey ? 'text' : 'password'}
                      placeholder="xkeysib-..."
                      value={brevo.apiKey}
                      onChange={e => {
                        setBrevo(b => ({ ...b, apiKey: e.target.value }))
                        setBrevoStatus('idle')
                      }}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBrevoKey(v => !v)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestBrevo}
                    disabled={testingBrevo || !brevo.apiKey}
                    className="gap-2 whitespace-nowrap min-w-[100px]"
                  >
                    {testingBrevo ? <Loader2 className="w-4 h-4 animate-spin" />
                      : brevoStatus === 'ok' ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : brevoStatus === 'error' ? <XCircle className="w-4 h-4 text-red-400" />
                      : <FlaskConical className="w-4 h-4" />}
                    Tester
                  </Button>
                </div>
                <HintText>
                  Trouvez votre clé sur{' '}
                  <a
                    href="https://app.brevo.com/settings/keys/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    app.brevo.com → Paramètres → Clés API
                  </a>
                </HintText>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>Email expéditeur</LabelText>
                  <Input
                    type="email"
                    placeholder="contact@monagence.fr"
                    value={brevo.fromEmail}
                    onChange={e => setBrevo(b => ({ ...b, fromEmail: e.target.value }))}
                  />
                  <HintText>Doit être vérifié dans Brevo</HintText>
                </div>
                <div>
                  <LabelText>Nom affiché</LabelText>
                  <Input
                    placeholder="Jean de Mon Agence Web"
                    value={brevo.fromName}
                    onChange={e => setBrevo(b => ({ ...b, fromName: e.target.value }))}
                  />
                  <HintText>Visible dans la boîte de réception</HintText>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />Configuration webhook Brevo
                </p>
                <p className="text-xs text-muted-foreground">
                  Pour activer le tracking (ouvertures, clics, désinscriptions RGPD), configurez ce webhook dans Brevo.
                </p>

                {/* URL dynamique + bouton copier */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">URL du webhook :</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs px-2 py-1.5 rounded bg-background text-primary border border-border break-all select-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com'}/api/emails/webhook
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      title="Copier l'URL"
                      onClick={() => {
                        const url = `${window.location.origin}/api/emails/webhook`
                        navigator.clipboard.writeText(url).then(() => toast.success('URL copiée !'))
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si vous avez défini <code className="text-primary">BREVO_WEBHOOK_SECRET</code>, ajoutez{' '}
                    <code className="text-primary">?secret=VOTRE_SECRET</code> à la fin de l'URL.
                  </p>
                </div>

                {/* Instructions pas-à-pas */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Comment configurer :</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Connectez-vous sur <a href="https://app.brevo.com" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">brevo.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                    <li>Allez dans <strong>Transactionnel → Webhooks</strong></li>
                    <li>Cliquez <strong>Créer un webhook</strong></li>
                    <li>Collez l'URL ci-dessus dans le champ URL</li>
                    <li>Cochez les événements : <strong>Délivré, Ouvert, Cliqué, Rebond dur, Désabonné</strong></li>
                    <li>Cliquez <strong>Enregistrer</strong></li>
                  </ol>
                </div>

                <p className="text-xs text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Désabonnement auto : tout prospect qui se désabonne est automatiquement blacklisté (RGPD).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ ANTHROPIC ════════════════════════════════════════════════════ */}
        <TabsContent value="anthropic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Configuration Anthropic
              </CardTitle>
              <CardDescription>
                API Claude pour la génération d&apos;emails personnalisés. Modèle : claude-sonnet-4-6 (~0.002€/email).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* API Key */}
              <div>
                <LabelText>
                  <span className="inline-flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />Clé API Anthropic
                  </span>
                </LabelText>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showAnthropicKey ? 'text' : 'password'}
                      placeholder="sk-ant-api03-..."
                      value={anthropic.apiKey}
                      onChange={e => {
                        setAnthropic({ apiKey: e.target.value })
                        setAnthropicStatus('idle')
                      }}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropicKey(v => !v)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestAnthropic}
                    disabled={testingAnthropic || !anthropic.apiKey}
                    className="gap-2 whitespace-nowrap min-w-[100px]"
                  >
                    {testingAnthropic ? <Loader2 className="w-4 h-4 animate-spin" />
                      : anthropicStatus === 'ok' ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : anthropicStatus === 'error' ? <XCircle className="w-4 h-4 text-red-400" />
                      : <FlaskConical className="w-4 h-4" />}
                    Tester
                  </Button>
                </div>
                <HintText>
                  Trouvez votre clé sur{' '}
                  <a
                    href="https://console.anthropic.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.anthropic.com → API Keys
                  </a>
                </HintText>
              </div>

              <Separator />

              {/* Info cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Modèle', value: 'sonnet-4-6', sub: 'Qualité / Prix optimaux' },
                  { label: 'Coût estimé', value: '~0.002€', sub: 'Par email généré' },
                  { label: 'Contexte', value: '200k', sub: 'Tokens par requête' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-card border text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-bold text-primary my-0.5">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <p className="text-sm font-medium text-amber-400 mb-1">⚠ Sécurité</p>
                <p className="text-xs text-muted-foreground">
                  Votre clé API est stockée en base de données et n&apos;est jamais exposée
                  côté client. En production, envisagez de la chiffrer (AES-256) avant stockage.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ LIMITES ══════════════════════════════════════════════════════ */}
        <TabsContent value="limites">
          <div className="space-y-4">

            {/* Limites d'envoi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Limites d&apos;envoi
                </CardTitle>
                <CardDescription>
                  Contrôlez le rythme pour maximiser la délivrabilité et respecter les limites Brevo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Emails/jour */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <LabelText>Emails par jour maximum</LabelText>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {limits.dailyEmailLimit}
                    </span>
                  </div>
                  <input
                    type="range" min={1} max={300}
                    value={limits.dailyEmailLimit}
                    onChange={e => setLimits(l => ({ ...l, dailyEmailLimit: Number(e.target.value) }))}
                    className="w-full accent-primary h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 — prudent</span>
                    <span className="text-amber-400 font-medium">50 — recommandé</span>
                    <span>300 — max Brevo</span>
                  </div>
                </div>

                <Separator />

                {/* Délai entre emails */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <LabelText>Délai minimum entre emails</LabelText>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {limits.delayBetweenEmails}s
                    </span>
                  </div>
                  <input
                    type="range" min={10} max={120} step={5}
                    value={limits.delayBetweenEmails}
                    onChange={e => setLimits(l => ({ ...l, delayBetweenEmails: Number(e.target.value) }))}
                    className="w-full accent-primary h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10s — rapide</span>
                    <span className="text-amber-400 font-medium">30s — recommandé</span>
                    <span>120s — très lent</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Préférences recherche */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  Préférences de recherche
                </CardTitle>
                <CardDescription>
                  Valeurs par défaut pour la recherche de prospects via Overpass API (OpenStreetMap).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <LabelText>Ville par défaut</LabelText>
                    <Input
                      placeholder="Paris"
                      value={limits.defaultCity}
                      onChange={e => setLimits(l => ({ ...l, defaultCity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <LabelText>Secteur par défaut</LabelText>
                    <Input
                      placeholder="restaurant, coiffeur, plombier…"
                      value={limits.defaultIndustry}
                      onChange={e => setLimits(l => ({ ...l, defaultIndustry: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Rayon */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <LabelText>Rayon de recherche par défaut</LabelText>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {limits.defaultSearchRadius} km
                    </span>
                  </div>
                  <input
                    type="range" min={1} max={50}
                    value={limits.defaultSearchRadius}
                    onChange={e => setLimits(l => ({ ...l, defaultSearchRadius: Number(e.target.value) }))}
                    className="w-full accent-primary h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 km</span>
                    <span className="text-amber-400 font-medium">15 km</span>
                    <span>50 km</span>
                  </div>
                </div>

                <Separator />

                {/* Auto-audit */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Audit automatique après recherche</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lance Playwright automatiquement après chaque batch Overpass
                    </p>
                  </div>
                  <Switch
                    checked={limits.autoAudit}
                    onCheckedChange={v => setLimits(l => ({ ...l, autoAudit: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TEMPLATES ════════════════════════════════════════════════════ */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Templates d&apos;emails
                  </CardTitle>
                  <CardDescription className="mt-1">
                    L&apos;IA utilise ces templates comme base pour générer des emails personnalisés.
                  </CardDescription>
                </div>
                <Button onClick={openNewTemplate} className="gap-2 ml-4">
                  <Plus className="w-4 h-4" />Nouveau
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Aucun template</p>
                  <p className="text-sm mt-1 text-center max-w-xs">
                    Créez votre premier template pour commencer à générer des emails de prospection.
                  </p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={openNewTemplate}>
                    <Plus className="w-4 h-4" />Créer un template
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(tpl => (
                    <div
                      key={tpl.id}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{tpl.name}</span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {TEMPLATE_TYPES.find(t => t.value === tpl.type)?.label ?? tpl.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{tpl.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-60">
                          {tpl.body}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => openEditTemplate(tpl)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          disabled={deletingId === tpl.id}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === tpl.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Template Dialog ══════════════════════════════════════════════════ */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <LabelText>Nom du template</LabelText>
                <Input
                  placeholder="Premier contact restaurant"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <LabelText>Type</LabelText>
                <Select
                  value={templateForm.type}
                  onValueChange={v => setTemplateForm(f => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <LabelText>Objet de l&apos;email</LabelText>
              <Input
                placeholder="Votre site web — quelques pistes d'amélioration"
                value={templateForm.subject}
                onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div>
              <LabelText>Corps de l&apos;email</LabelText>
              <Textarea
                placeholder={`Bonjour {prenom},\n\nJ'ai analysé le site de {entreprise} et j'ai identifié plusieurs points d'amélioration...\n\n{signature}`}
                value={templateForm.body}
                onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                rows={10}
                className="font-mono text-sm resize-none"
              />
              <HintText>
                Variables&nbsp;: {'{prenom}'}, {'{entreprise}'}, {'{ville}'}, {'{secteur}'}, {'{issues}'}, {'{score}'}, {'{signature}'}
              </HintText>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="gap-2">
              {savingTemplate
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {savingTemplate
                ? 'Enregistrement…'
                : editingTemplate ? 'Mettre à jour' : 'Créer le template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
