# ProspectFlow

Outil de prospection automatisée pour freelances et agences web.
Trouve les entreprises avec des sites obsolètes ou inexistants, score leurs opportunités, génère des emails IA personnalisés et suit les réponses.

---

## Fonctionnalités

- **Recherche** : Overpass API (OpenStreetMap) — 100 % gratuit, sans clé API
- **Audit technique** : Playwright headless — SSL, responsive, CMS, Mobile/SEO/Perf scores
- **Scoring** : Algorithme 0-100 (sans site +60, HTTP +25, builder cheap +15…)
- **CRM** : Table prospects avec filtres, tri, pagination, statuts pipeline
- **Fiche prospect** : Infos / Audit / Emails / Notes
- **Génération emails IA** : Claude claude-sonnet-4-6 avec contexte audit (~0,002 €/email)
- **Envoi emails** : API Brevo (300 emails/jour gratuit)
- **Tracking** : Webhooks Brevo (opened, clicked, replied, bounced, unsubscribed)
- **Dashboard** : KPIs, graphiques Recharts, funnel de conversion, Top HOT
- **Campagnes** : Séquences J+0/J+3/J+7 avec règles d'arrêt automatiques
- **Enrichissement** : Google Maps via Playwright (optionnel, toggle dans l'UI)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js API Routes |
| BDD | PostgreSQL via Supabase (plan gratuit) |
| Auth | NextAuth.js v4 (credentials) |
| IA | API Anthropic — `claude-sonnet-4-6` |
| Scraping | Playwright headless (audit + enrichissement Google Maps) |
| Recherche | Overpass API + Nominatim (OpenStreetMap) |
| Emails | Brevo API REST (300 emails/jour gratuit) |
| Charts | Recharts v3 |
| ORM | Prisma 7 (client généré dans `src/generated/prisma/`) |

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Brevo](https://www.brevo.com) (gratuit — 300 emails/jour)
- Une clé API [Anthropic](https://console.anthropic.com) (pay-as-you-go, ~0,002 €/email)

---

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone <url-du-repo>
cd prospectflow
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Ouvrir `.env` et remplir :

```env
# ── Base de données Supabase ──────────────────────────────────────────────────
# Récupérer dans : Supabase Dashboard → Settings → Database → Connection string → URI
# Remplacer [YOUR-PASSWORD] par votre mot de passe de base de données
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"

# ── NextAuth ──────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET="une-chaine-aleatoire-longue-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# ── Anthropic (IA — génération emails) ───────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."

# ── Brevo (envoi emails) ──────────────────────────────────────────────────────
BREVO_API_KEY="xkeysib-..."
BREVO_WEBHOOK_SECRET="un-secret-aleatoire-pour-les-webhooks"

# ── Application ───────────────────────────────────────────────────────────────
APP_URL="http://localhost:3000"
DAILY_EMAIL_LIMIT=50
```

> Les clés API Anthropic et Brevo peuvent aussi être configurées directement dans l'interface via **Paramètres → IA** et **Paramètres → Brevo** — elles seront stockées en base de données.

### 3. Configurer Supabase

#### a) Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Choisir une région (EU West pour la France)
3. Définir un mot de passe sécurisé pour la base

#### b) Récupérer l'URL de connexion

**Supabase Dashboard → Settings → Database → Connection string → URI (Transaction mode)**

Exemple :
```
postgresql://postgres.abcdefgh:[password]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
```

Ajouter `?pgbouncer=true` à la fin.

#### c) Appliquer le schéma Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers Supabase (crée toutes les tables)
npx prisma db push
```

#### d) Peupler avec des données de test (optionnel)

```bash
npx prisma db seed
```

Le seed crée : 1 utilisateur admin, 80 prospects réalistes, 3 campagnes, 4 templates, 30 emails, 20 notes.

> **Identifiants du compte seed :** `admin@prospectflow.fr` / `password123`

### 4. Installer Playwright (pour l'audit et l'enrichissement)

```bash
# Installer Chromium dans le dossier du projet
PLAYWRIGHT_BROWSERS_PATH=./playwright-browsers npx playwright install chromium
```

> Playwright est utilisé uniquement côté serveur via un processus enfant — il n'est jamais bundlé côté client.

### 5. Lancer en développement

```bash
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## Configuration Brevo (webhooks)

Pour que le tracking des emails (ouverture, clic, réponse, désinscription) fonctionne, configurer un webhook dans Brevo :

1. **Brevo Dashboard → Transactional → Settings → Webhook**
2. **URL** : `https://votre-domaine.com/api/emails/webhook?secret=VOTRE_BREVO_WEBHOOK_SECRET`
3. **Events à cocher** : `delivered`, `opened`, `clicks`, `soft_bounce`, `hard_bounce`, `unsubscribed`, `spam`, `invalid_email`

> En développement, utiliser [ngrok](https://ngrok.com) ou [localtunnel](https://localtunnel.me) pour exposer localhost.

---

## Déploiement sur Vercel

### 1. Préparer le repo

```bash
git init
git add .
git commit -m "Initial commit"
```

Pousser sur GitHub/GitLab/Bitbucket.

### 2. Créer un projet Vercel

1. [vercel.com](https://vercel.com) → **New Project** → importer le repo
2. **Framework Preset** : Next.js (détecté automatiquement)
3. **Root Directory** : `prospectflow` (si le repo contient d'autres dossiers)

### 3. Variables d'environnement

Dans Vercel → **Settings → Environment Variables**, ajouter toutes les variables du `.env` (remplacer `NEXTAUTH_URL` et `APP_URL` par votre domaine Vercel).

### 4. Déployer

```bash
vercel --prod
```

### 5. Mettre à jour `NEXTAUTH_URL` et `APP_URL`

Après le premier déploiement, mettre à jour ces deux variables avec l'URL Vercel définitive (ex: `https://prospectflow.vercel.app`).

### 6. Appliquer le schéma en production

```bash
DATABASE_URL="<url-supabase-production>" npx prisma db push
```

---

## Structure du projet

```
prospectflow/
├── prisma/
│   ├── schema.prisma          # Schéma BDD (8 modèles, 7 enums)
│   └── seed.ts                # Seed données de test
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard (/)
│   │   ├── search/            # Recherche Overpass (/search)
│   │   ├── prospects/         # CRM (/prospects + /prospects/[id])
│   │   ├── campaigns/         # Campagnes (/campaigns + /campaigns/[id])
│   │   ├── settings/          # Paramètres (/settings)
│   │   └── api/               # Routes API
│   │       ├── prospects/     # CRUD prospects + search SSE + audit
│   │       ├── emails/        # generate, send, webhook
│   │       ├── campaigns/     # CRUD campagnes + launch
│   │       ├── dashboard/     # stats
│   │       └── settings/      # settings + templates
│   ├── components/
│   │   ├── layout/            # Sidebar, Header
│   │   ├── prospects/         # ScoreCircle
│   │   └── emails/            # EmailComposer
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient
│   │   ├── overpass.ts        # Geocode (Nominatim) + search (Overpass QL)
│   │   ├── scoring.ts         # Score prospect depuis données OSM
│   │   ├── scorer.ts          # Score post-audit (site + prospect)
│   │   ├── scraper.ts         # Audit Playwright (desktop + mobile)
│   │   ├── anthropic.ts       # Génération emails IA
│   │   ├── brevo.ts           # Envoi email API REST Brevo
│   │   ├── gmaps-enricher.ts  # Enrichissement Google Maps (Playwright)
│   │   ├── mock-prospects.ts  # Données mock CRM
│   │   ├── mock-campaigns.ts  # Données mock campagnes
│   │   └── sectors.ts         # 30 secteurs d'activité + tags OSM
│   ├── scripts/
│   │   └── audit-worker.ts    # Worker Playwright (processus enfant)
│   └── generated/
│       └── prisma/            # Client Prisma généré (ne pas éditer)
└── .env                       # Variables d'environnement (non commité)
```

---

## Commandes utiles

```bash
# Développement
npm run dev                    # Démarrer en dev (port 3000)
npm run build                  # Build production
npm run start                  # Démarrer le build prod

# Base de données
npx prisma generate            # Régénérer le client Prisma
npx prisma db push             # Pousser le schéma (sans migration)
npx prisma migrate dev         # Créer une migration (avec historique)
npx prisma studio              # Interface graphique BDD
npx prisma db seed             # Peupler avec données de test

# TypeScript
npx tsc --noEmit               # Vérifier sans compiler
```

---

## Notes importantes

### Prisma 7
Le client est généré dans `src/generated/prisma/` (chemin non standard). Toutes les requêtes Prisma dans les routes API utilisent le cast `(prisma.model as any)` — c'est intentionnel et non une erreur.

### Enrichissement Google Maps
L'enrichissement via Playwright (`gmaps-enricher.ts`) est optionnel. Il se lance uniquement si le toggle "Enrichir GMaps" est activé dans la page Recherche. Des délais aléatoires de 2-4s entre requêtes sont appliqués pour éviter le blocage.

### Mode sans base de données
L'application fonctionne entièrement sans `DATABASE_URL` configurée : toutes les routes API ont un fallback mock qui retourne des données réalistes. Idéal pour tester l'UI avant de configurer Supabase.

### Coût estimé
- Recherche Overpass + Nominatim : gratuit (self-hosted, rate limit raisonnable)
- Envoi emails Brevo : gratuit jusqu'à 300/jour
- IA Anthropic : ~0,002 € par email généré (claude-sonnet-4-6)
- Supabase : gratuit (500 MB, 2 connexions simultanées)
- Vercel : gratuit (hobby plan)

**Coût mensuel estimé pour 500 prospects et 300 emails** : < 1 €

---

## Licence

Usage privé.
