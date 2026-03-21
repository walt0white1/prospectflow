'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, ArrowRight, Search, BarChart3, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const MOCK_PROSPECTS = [
  { name: 'Boulangerie Dupont', city: 'Lyon', score: 82, hot: true },
  { name: 'Garage Moreau', city: 'Paris', score: 74, hot: true },
  { name: 'Coiff\'Style', city: 'Bordeaux', score: 67, hot: false },
]

function ScoreDot({ score }: { score: number }) {
  const color = score >= 75 ? '#ef4444' : score >= 60 ? '#f97316' : '#eab308'
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {score}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      toast.error('Email ou mot de passe incorrect')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0b0f' }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col relative overflow-hidden p-12">

        {/* Background gradient blobs */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 10%, #4f46e530 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #7c3aed20 0%, transparent 55%)',
          }}
        />
        <div
          className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
        <div
          className="absolute bottom-[-100px] right-[-60px] w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 mb-auto">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ProspectFlow</span>
        </div>

        {/* Hero copy */}
        <div className="relative mt-16 mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: '#6366f120', color: '#a5b4fc', border: '1px solid #6366f130' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Propulsé par Claude Sonnet — Anthropic
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Trouvez vos prochains<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              clients automatiquement.
            </span>
          </h1>

          <p className="text-base leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
            Détectez les entreprises avec des sites obsolètes,<br />
            auditez-les en 30 secondes, envoyez des emails<br />
            ultra-personnalisés générés par IA.
          </p>

          <ul className="space-y-3">
            {[
              { icon: Search, text: 'Recherche automatique par secteur & ville' },
              { icon: BarChart3, text: 'Audit technique + score de priorité instantané' },
              { icon: Mail, text: 'Email IA personnalisé avec les failles détectées' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
                <span className="text-sm" style={{ color: '#cbd5e1' }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* App mockup card */}
        <div
          className="relative rounded-2xl p-5 mt-auto"
          style={{
            background: '#131520',
            border: '1px solid #1e2030',
            boxShadow: '0 24px 60px #00000060, 0 0 0 1px #6366f110',
          }}
        >
          {/* Mockup header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#94a3b8' }}>Recherche en cours</p>
              <p className="text-sm font-semibold text-white">Coiffeurs · Paris · 10 km</p>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#ef444415', color: '#f87171' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              47 trouvés
            </div>
          </div>

          {/* Mockup prospect rows */}
          <div className="space-y-2">
            {MOCK_PROSPECTS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: '#0d0e18', border: '1px solid #1e2030' }}
              >
                <ScoreDot score={p.score} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.name}</p>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>{p.city} · Sans site web</p>
                </div>
                {p.hot && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: '#ef444415', color: '#f87171' }}
                  >
                    HOT
                  </span>
                )}
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: '#6366f120' }}
                >
                  <Mail className="w-3 h-3" style={{ color: '#818cf8' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Mockup footer */}
          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: '1px solid #1e2030' }}
          >
            <span className="text-[11px]" style={{ color: '#475569' }}>
              38 sans site · 9 sites obsolètes
            </span>
            <span
              className="text-[11px] font-medium flex items-center gap-1"
              style={{ color: '#818cf8' }}
            >
              Générer les emails <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ background: '#0d0e18', borderLeft: '1px solid #1a1b2e' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-white font-semibold text-lg">ProspectFlow</span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5" style={{ letterSpacing: '-0.02em' }}>
              Bon retour 👋
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Connectez-vous à votre espace ProspectFlow
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
                autoFocus
                className="h-11 text-sm"
                style={{
                  background: '#131520',
                  border: '1px solid #1e2030',
                  color: '#e2e8f0',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11 text-sm"
                style={{
                  background: '#131520',
                  border: '1px solid #1e2030',
                  color: '#e2e8f0',
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-2"
              disabled={loading}
              style={{
                background: loading
                  ? '#4338ca'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                boxShadow: loading ? 'none' : '0 4px 20px #6366f140',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Connexion…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Se connecter <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #1a1b2e' }}>
            <p className="text-center text-sm" style={{ color: '#475569' }}>
              Pas encore de compte ?{' '}
              <Link
                href="/register"
                className="font-medium transition-colors hover:underline"
                style={{ color: '#818cf8' }}
              >
                Créer un compte gratuit
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
