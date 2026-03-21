'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const TESTIMONIALS = [
  { name: 'Mathieu R.', role: 'Freelance dev web', text: '12 nouveaux clients en 3 semaines. L\'audit automatique change tout.' },
  { name: 'Sara K.', role: 'Agence digitale', text: 'On a remplacé 2h de prospection manuelle par 10 minutes avec ProspectFlow.' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'inscription")
        setLoading(false)
        return
      }
      await signIn('credentials', { email, password, redirect: false })
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Erreur serveur')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0b0f' }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden p-12">

        {/* Background gradient blobs */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 10% 20%, #4f46e540 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 70%, #7c3aed25 0%, transparent 55%)',
          }}
        />
        <div
          className="absolute top-[-100px] right-[-60px] w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
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
          <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Commencez à prospecter<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              intelligemment.
            </span>
          </h1>

          <p className="text-base leading-relaxed mb-10" style={{ color: '#94a3b8' }}>
            Rejoignez les freelances et agences qui automatisent<br />
            leur prospection avec l&apos;IA et gagnent du temps chaque semaine.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { value: '100+', label: 'Secteurs couverts' },
              { value: '30s', label: 'Audit complet' },
              { value: '0€', label: 'Pour démarrer' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{ background: '#131520', border: '1px solid #1e2030' }}
              >
                <p
                  className="text-2xl font-bold mb-0.5"
                  style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  {value}
                </p>
                <p className="text-[11px]" style={{ color: '#64748b' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-4"
                style={{ background: '#131520', border: '1px solid #1e2030' }}
              >
                <div className="flex gap-0.5 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" style={{ color: '#fbbf24' }} />
                  ))}
                </div>
                <p className="text-sm mb-2.5 leading-relaxed" style={{ color: '#cbd5e1' }}>&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{t.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
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
              Créer un compte
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Gratuit · Pas de carte requise · Prêt en 2 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Prénom &amp; Nom <span style={{ color: '#475569' }}>(optionnel)</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jean Dupont"
                autoComplete="name"
                autoFocus
                className="h-11 text-sm"
                style={{ background: '#131520', border: '1px solid #1e2030', color: '#e2e8f0' }}
              />
            </div>

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
                className="h-11 text-sm"
                style={{ background: '#131520', border: '1px solid #1e2030', color: '#e2e8f0' }}
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
                placeholder="Min. 8 caractères"
                required
                autoComplete="new-password"
                className="h-11 text-sm"
                style={{ background: '#131520', border: '1px solid #1e2030', color: '#e2e8f0' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-11 text-sm"
                style={{ background: '#131520', border: '1px solid #1e2030', color: '#e2e8f0' }}
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
                  Création du compte…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Créer mon compte gratuitement <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-[11px] leading-relaxed" style={{ color: '#334155' }}>
              En créant un compte, vous acceptez nos{' '}
              <span className="underline cursor-pointer" style={{ color: '#475569' }}>CGU</span>
              {' '}et notre{' '}
              <span className="underline cursor-pointer" style={{ color: '#475569' }}>politique de confidentialité</span>.
            </p>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #1a1b2e' }}>
            <p className="text-center text-sm" style={{ color: '#475569' }}>
              Déjà un compte ?{' '}
              <Link
                href="/login"
                className="font-medium transition-colors hover:underline"
                style={{ color: '#818cf8' }}
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
