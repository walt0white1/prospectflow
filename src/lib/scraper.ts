// ── Audit technique de sites web via Playwright ───────────────────────────────
// SERVER-ONLY — Ne jamais importer côté client.
// Timeout max : 15 secondes par site. User-Agent respectueux.

export type AuditIssue = {
  label: string
  severity: 'high' | 'medium' | 'low'
  category: 'performance' | 'security' | 'mobile' | 'seo' | 'design' | 'legal'
  description?: string
  recommendation?: string
}

export type AuditResult = {
  url: string
  scannedAt: string

  // ── Scores (compatibles avec MockAudit) ───────────────────────────
  mobileScore: number
  seoScore: number
  performanceScore: number

  // ── Perf ──────────────────────────────────────────────────────────
  loadTimeSec: number
  pageSize: number      // Ko estimé

  // ── Sécurité ──────────────────────────────────────────────────────
  hasSSL: boolean

  // ── Mobile ────────────────────────────────────────────────────────
  isResponsive: boolean
  hasViewportMeta: boolean

  // ── SEO ───────────────────────────────────────────────────────────
  hasTitle: boolean
  title: string
  hasMetaDescription: boolean
  metaDescription: string
  hasH1: boolean
  h1Text: string
  hasOpenGraph: boolean
  hasSitemap: boolean
  hasRobotsTxt: boolean
  hasCanonical: boolean

  // ── Légal ─────────────────────────────────────────────────────────
  hasMentionsLegales: boolean

  // ── Tech ──────────────────────────────────────────────────────────
  cms: string | null
  techStack: string[]
  designAge: number | null   // Année estimée du design

  // ── Accessibilité ─────────────────────────────────────────────────
  imagesWithoutAlt: number

  // ── Issues ────────────────────────────────────────────────────────
  issues: AuditIssue[]

  // ── Screenshots (optionnel) ───────────────────────────────────────
  screenshotDesktop?: string  // base64 JPEG
  screenshotMobile?: string
}

// ── CMS detection patterns ────────────────────────────────────────────────────

const CMS_PATTERNS: Array<{ name: string; patterns: string[] }> = [
  { name: 'WordPress',   patterns: ['wp-content', 'wp-includes', 'wp-json', '/wordpress/'] },
  { name: 'Wix',        patterns: ['wixstatic.com', 'parastorage.com', 'wix.com/dpages', 'X-Wix-'] },
  { name: 'Squarespace', patterns: ['static.squarespace.com', 'squarespace.com/s/'] },
  { name: 'Jimdo',      patterns: ['jimdofree.com', 'jimdosite.com', 'jimdocdn.com', 'cdn.jimdostatic.com'] },
  { name: 'Webflow',    patterns: ['webflow.com', 'webflow.io', '.webflow.'] },
  { name: 'Shopify',    patterns: ['cdn.shopify.com', 'myshopify.com', 'Shopify.theme'] },
  { name: 'Prestashop', patterns: ['prestashop', 'presta-shop'] },
  { name: 'Joomla',     patterns: ['/joomla', 'Joomla!', 'com_content'] },
  { name: 'Drupal',     patterns: ['sites/all/modules', '/drupal', 'Drupal.settings'] },
  { name: 'Google Sites', patterns: ['sites.google.com', 'googleusercontent.com/sites'] },
  { name: 'Over-blog',  patterns: ['over-blog.com', 'overblog.com'] },
  { name: 'e-monsite',  patterns: ['e-monsite.com'] },
  { name: 'Webnode',    patterns: ['webnode.fr', 'webnode.com'] },
]

function detectCMS(html: string, url: string): string | null {
  const combined = html + ' ' + url
  for (const { name, patterns } of CMS_PATTERNS) {
    if (patterns.some(p => combined.includes(p))) return name
  }
  return null
}

// ── Design age estimation ─────────────────────────────────────────────────────

function estimateDesignAge(html: string): number | null {
  // Copyright year in footer
  const copyrightMatch = html.match(/©\s*(\d{4})|copyright\s+(\d{4})/i)
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1] ?? copyrightMatch[2])
    if (year >= 2000 && year <= new Date().getFullYear()) return year
  }
  // Schema.org datePublished
  const dateMatch = html.match(/"datePublished"\s*:\s*"(\d{4})/)
  if (dateMatch) {
    const year = parseInt(dateMatch[1])
    if (year >= 2000 && year <= new Date().getFullYear()) return year
  }
  return null
}

// ── Score calculators ─────────────────────────────────────────────────────────

function calcSeoScore(data: {
  hasTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  hasOpenGraph: boolean
  hasSitemap: boolean
  hasRobotsTxt: boolean
  hasCanonical: boolean
}): number {
  let score = 0
  if (data.hasTitle)          score += 25
  if (data.hasMetaDescription) score += 20
  if (data.hasH1)             score += 15
  if (data.hasOpenGraph)      score += 15
  if (data.hasSitemap)        score += 10
  if (data.hasRobotsTxt)      score += 10
  if (data.hasCanonical)      score += 5
  return Math.min(100, score)
}

function calcMobileScore(data: {
  hasViewportMeta: boolean
  isResponsive: boolean
}): number {
  let score = 0
  if (data.hasViewportMeta) score += 50
  if (data.isResponsive)    score += 50
  return score
}

function calcPerfScore(loadTimeSec: number): number {
  if (loadTimeSec < 1)  return 95
  if (loadTimeSec < 2)  return 85
  if (loadTimeSec < 3)  return 70
  if (loadTimeSec < 5)  return 50
  if (loadTimeSec < 8)  return 30
  if (loadTimeSec < 12) return 15
  return 5
}

// ── Issue generator ───────────────────────────────────────────────────────────

function buildIssues(data: {
  hasSSL: boolean
  loadTimeSec: number
  isResponsive: boolean
  hasViewportMeta: boolean
  hasTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  hasOpenGraph: boolean
  hasSitemap: boolean
  hasRobotsTxt: boolean
  hasMentionsLegales: boolean
  imagesWithoutAlt: number
  cms: string | null
  designAge: number | null
  techStack: string[]
}): AuditIssue[] {
  const issues: AuditIssue[] = []

  // ── Sécurité ──────────────────────────────────────────────────────────────
  if (!data.hasSSL) {
    issues.push({
      label: 'Site en HTTP — pas de certificat SSL',
      severity: 'high',
      category: 'security',
      description: 'Les visiteurs voient "Site non sécurisé" dans leur navigateur.',
      recommendation: 'Installer un certificat SSL (gratuit avec Let\'s Encrypt).',
    })
  }

  // ── Performance ───────────────────────────────────────────────────────────
  if (data.loadTimeSec > 8) {
    issues.push({
      label: `Chargement très lent : ${data.loadTimeSec.toFixed(1)}s`,
      severity: 'high',
      category: 'performance',
      description: 'Au-delà de 3 secondes, 53% des visiteurs mobiles abandonnent.',
      recommendation: 'Optimiser les images, activer le cache, utiliser un CDN.',
    })
  } else if (data.loadTimeSec > 5) {
    issues.push({
      label: `Chargement lent : ${data.loadTimeSec.toFixed(1)}s`,
      severity: 'medium',
      category: 'performance',
      description: 'Temps de chargement supérieur à la moyenne recommandée (< 3s).',
      recommendation: 'Compresser les images et minifier CSS/JS.',
    })
  } else if (data.loadTimeSec > 3) {
    issues.push({
      label: `Chargement à optimiser : ${data.loadTimeSec.toFixed(1)}s`,
      severity: 'low',
      category: 'performance',
      recommendation: 'Activer la compression gzip et optimiser les images.',
    })
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (!data.hasViewportMeta) {
    issues.push({
      label: 'Balise viewport absente — Non responsive',
      severity: 'high',
      category: 'mobile',
      description: 'Sans balise viewport, le site s\'affiche mal sur mobile.',
      recommendation: 'Ajouter <meta name="viewport" content="width=device-width, initial-scale=1">.',
    })
  } else if (!data.isResponsive) {
    issues.push({
      label: 'Site non responsive — Mauvaise expérience mobile',
      severity: 'high',
      category: 'mobile',
      description: 'Plus de 60% du trafic est mobile. Un site non adapté perd des clients.',
      recommendation: 'Refondre le CSS avec une approche mobile-first ou utiliser Bootstrap/Tailwind.',
    })
  }

  // ── SEO ───────────────────────────────────────────────────────────────────
  if (!data.hasTitle) {
    issues.push({
      label: 'Balise <title> manquante',
      severity: 'high',
      category: 'seo',
      description: 'Le titre est essentiel pour le référencement et l\'affichage dans Google.',
      recommendation: 'Ajouter une balise <title> décrivant l\'activité et la localisation.',
    })
  }
  if (!data.hasMetaDescription) {
    issues.push({
      label: 'Meta description absente',
      severity: 'medium',
      category: 'seo',
      description: 'Sans meta description, Google génère automatiquement un extrait peu attrayant.',
      recommendation: 'Rédiger une description de 150-160 caractères incluant mots-clés et appel à l\'action.',
    })
  }
  if (!data.hasH1) {
    issues.push({
      label: 'Pas de balise H1 visible',
      severity: 'medium',
      category: 'seo',
      recommendation: 'Ajouter un H1 décrivant clairement l\'activité de l\'entreprise.',
    })
  }
  if (!data.hasOpenGraph) {
    issues.push({
      label: 'Balises Open Graph absentes',
      severity: 'low',
      category: 'seo',
      description: 'Sans OG, les partages réseaux sociaux n\'affichent pas d\'aperçu attrayant.',
      recommendation: 'Ajouter og:title, og:description et og:image.',
    })
  }
  if (!data.hasSitemap) {
    issues.push({
      label: 'Sitemap XML introuvable',
      severity: 'low',
      category: 'seo',
      recommendation: 'Créer et soumettre un sitemap.xml à Google Search Console.',
    })
  }
  if (!data.hasRobotsTxt) {
    issues.push({
      label: 'robots.txt manquant',
      severity: 'low',
      category: 'seo',
      recommendation: 'Ajouter un fichier robots.txt à la racine du site.',
    })
  }

  // ── Légal ─────────────────────────────────────────────────────────────────
  if (!data.hasMentionsLegales) {
    issues.push({
      label: 'Mentions légales introuvables',
      severity: 'medium',
      category: 'legal',
      description: 'Obligatoires en France pour tout site professionnel (loi pour la confiance dans l\'économie numérique).',
      recommendation: 'Créer une page Mentions Légales avec nom, adresse, SIRET et hébergeur.',
    })
  }

  // ── Accessibilité ─────────────────────────────────────────────────────────
  if (data.imagesWithoutAlt > 3) {
    issues.push({
      label: `${data.imagesWithoutAlt} image${data.imagesWithoutAlt > 1 ? 's' : ''} sans attribut alt`,
      severity: 'low',
      category: 'seo',
      description: 'Les images sans alt sont ignorées par les moteurs de recherche et illisibles par les lecteurs d\'écran.',
      recommendation: 'Ajouter des descriptions alt pertinentes à toutes les images.',
    })
  }

  // ── Design / Tech ─────────────────────────────────────────────────────────
  if (data.techStack.includes('Flash')) {
    issues.push({
      label: 'Technologie Flash détectée — Obsolète',
      severity: 'high',
      category: 'design',
      description: 'Flash n\'est plus supporté depuis 2020. Le contenu est inaccessible sur tous les navigateurs modernes.',
      recommendation: 'Remplacer immédiatement par HTML5/CSS3/JavaScript.',
    })
  }
  if (data.techStack.includes('Tables-layout')) {
    issues.push({
      label: 'Mise en page par tableaux HTML (années 2000)',
      severity: 'high',
      category: 'design',
      description: 'Ce design daté signale un site vieux de plus de 15 ans.',
      recommendation: 'Refondre avec un layout CSS moderne (Flexbox/Grid).',
    })
  }
  if (data.designAge && data.designAge < 2016) {
    issues.push({
      label: `Design estimé à ${data.designAge} — Site très daté`,
      severity: 'high',
      category: 'design',
      recommendation: 'Refonte complète recommandée pour moderniser l\'image de marque.',
    })
  } else if (data.designAge && data.designAge < 2019) {
    issues.push({
      label: `Design estimé à ${data.designAge} — Site daté`,
      severity: 'medium',
      category: 'design',
      recommendation: 'Mise à jour du design recommandée.',
    })
  }
  if (data.cms && ['Wix', 'Jimdo', 'Webnode', 'e-monsite'].includes(data.cms)) {
    issues.push({
      label: `Site créé avec ${data.cms} — Constructeur basique`,
      severity: 'medium',
      category: 'design',
      description: `${data.cms} impose des limitations et freine l'optimisation SEO.`,
      recommendation: 'Migrer vers une solution professionnelle (WordPress, Next.js).',
    })
  }

  return issues
}

// ── Main audit function ───────────────────────────────────────────────────────

export type AuditOptions = {
  screenshots?: boolean
  timeout?: number   // ms, default 15000
}

export async function auditWebsite(
  url: string,
  opts: AuditOptions = {},
): Promise<AuditResult> {
  const { screenshots = false, timeout = 15000 } = opts
  const scannedAt = new Date().toISOString()

  // Normaliser URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const hasSSL = normalizedUrl.startsWith('https://')

  // Import dynamique Playwright (server-only)
  const { chromium } = await import('playwright')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  try {
    // ── Desktop page ────────────────────────────────────────────────────────
    const desktopContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 ProspectFlow/1.0',
      viewport: { width: 1280, height: 900 },
      locale: 'fr-FR',
    })
    // Bloquer les publicités et ressources non essentielles pour accélérer
    await desktopContext.route('**/*.{woff,woff2,ttf,mp4,webm,mkv}', r => r.abort())
    await desktopContext.route('**/{ads,analytics,tracking}**', r => r.abort())

    const desktopPage = await desktopContext.newPage()

    const startMs = Date.now()
    let navigationOk = false
    try {
      await desktopPage.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout,
      })
      navigationOk = true
    } catch {
      // Timeout ou erreur réseau — on continue avec ce qu'on a
    }
    const loadTimeSec = (Date.now() - startMs) / 1000

    // Screenshot desktop
    let screenshotDesktop: string | undefined
    if (screenshots && navigationOk) {
      screenshotDesktop = (await desktopPage.screenshot({
        type: 'jpeg', quality: 50,
      })).toString('base64')
    }

    // ── Extract page data ────────────────────────────────────────────────────
    interface PageData {
      title: string
      hasMetaDescription: boolean
      metaDescription: string
      hasH1: boolean
      h1Text: string
      hasViewportMeta: boolean
      viewportContent: string
      hasOpenGraph: boolean
      hasCanonical: boolean
      html: string
      htmlLength: number
      imagesWithoutAlt: number
      hasMentionsLegales: boolean
      hasFlash: boolean
      hasTableLayout: boolean
      styleSheets: string[]
    }

    let pageData: PageData = {
      title: '',
      hasMetaDescription: false,
      metaDescription: '',
      hasH1: false,
      h1Text: '',
      hasViewportMeta: false,
      viewportContent: '',
      hasOpenGraph: false,
      hasCanonical: false,
      html: '',
      htmlLength: 0,
      imagesWithoutAlt: 0,
      hasMentionsLegales: false,
      hasFlash: false,
      hasTableLayout: false,
      styleSheets: [],
    }

    if (navigationOk) {
      pageData = await desktopPage.evaluate((): PageData => {
        const d = document
        const html = d.documentElement.outerHTML

        // Meta tags
        const metaDesc = d.querySelector('meta[name="description"]') as HTMLMetaElement | null
        const viewport = d.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
        const h1El = d.querySelector('h1')
        const ogTitle = d.querySelector('meta[property="og:title"]')
        const canonical = d.querySelector('link[rel="canonical"]')

        // Images without alt
        const imgs = Array.from(d.querySelectorAll('img'))
        const imagesWithoutAlt = imgs.filter(img => !img.getAttribute('alt')?.trim()).length

        // Mentions légales
        const links = Array.from(d.querySelectorAll('a'))
        const hasMentionsLegales = links.some(a =>
          a.textContent?.toLowerCase().includes('mentions légales') ||
          a.href?.includes('mentions') ||
          a.href?.includes('legal'),
        )

        // Flash
        const flashEls = d.querySelectorAll('object[type="application/x-shockwave-flash"], embed[type="application/x-shockwave-flash"]')
        const hasFlash = flashEls.length > 0

        // Table layout (heuristic: main table with many cells and no role="presentation")
        const tables = Array.from(d.querySelectorAll('table'))
        const hasTableLayout = tables.some(t =>
          !t.getAttribute('role') &&
          t.querySelectorAll('td').length > 6 &&
          !t.closest('article, form, .card'),
        )

        // StyleSheets
        const sheets = Array.from(d.querySelectorAll('link[rel="stylesheet"]'))
          .map(el => (el as HTMLLinkElement).href)
          .filter(Boolean)
          .slice(0, 5) // limit

        return {
          title: d.title ?? '',
          hasMetaDescription: !!metaDesc?.content,
          metaDescription: metaDesc?.content ?? '',
          hasH1: !!h1El,
          h1Text: h1El?.textContent?.trim().slice(0, 100) ?? '',
          hasViewportMeta: !!viewport,
          viewportContent: viewport?.content ?? '',
          hasOpenGraph: !!ogTitle,
          hasCanonical: !!canonical,
          html: html.slice(0, 50000), // Limiter pour la détection CMS
          htmlLength: html.length,
          imagesWithoutAlt,
          hasMentionsLegales,
          hasFlash,
          hasTableLayout,
          styleSheets: sheets,
        }
      })
    }

    // ── Mobile page (check responsive) ──────────────────────────────────────
    const mobileContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 812 },
      isMobile: true,
      locale: 'fr-FR',
    })
    await mobileContext.route('**/*.{woff,woff2,ttf,mp4,webm}', r => r.abort())

    const mobilePage = await mobileContext.newPage()
    let isResponsive = pageData.hasViewportMeta  // Heuristic: if viewport meta, assume responsive
    let screenshotMobile: string | undefined

    try {
      await mobilePage.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 10000 })

      // Check horizontal overflow (indicateur non-responsive)
      const overflowCheck = await mobilePage.evaluate(() => {
        const bodyScrollWidth = document.body.scrollWidth
        const viewportWidth = window.innerWidth
        return {
          isOverflowing: bodyScrollWidth > viewportWidth + 10,
          bodyWidth: bodyScrollWidth,
          viewportWidth,
        }
      })
      // Si dépassement horizontal significatif → pas responsive
      if (overflowCheck.isOverflowing) isResponsive = false
      else if (pageData.hasViewportMeta) isResponsive = true

      if (screenshots) {
        screenshotMobile = (await mobilePage.screenshot({
          type: 'jpeg', quality: 50,
        })).toString('base64')
      }
    } catch {
      // Silently continue
    }

    // ── Check robots.txt et sitemap.xml ──────────────────────────────────────
    const origin = new URL(normalizedUrl).origin
    const [robotsOk, sitemapOk] = await Promise.all([
      fetch(`${origin}/robots.txt`, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        .then(r => r.ok)
        .catch(() => false),
      fetch(`${origin}/sitemap.xml`, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        .then(r => r.ok)
        .catch(() => false),
    ])

    // ── CMS + tech stack ─────────────────────────────────────────────────────
    const cms = detectCMS(pageData.html, normalizedUrl)
    const techStack: string[] = []
    if (cms) techStack.push(cms)
    if (pageData.hasFlash) techStack.push('Flash')
    if (pageData.hasTableLayout) techStack.push('Tables-layout')
    if (pageData.html.includes('jQuery')) techStack.push('jQuery')
    if (pageData.html.includes('bootstrap')) techStack.push('Bootstrap')

    // ── Design age ───────────────────────────────────────────────────────────
    const designAge = estimateDesignAge(pageData.html)

    // ── Scores ───────────────────────────────────────────────────────────────
    const seoScore = calcSeoScore({
      hasTitle: !!pageData.title,
      hasMetaDescription: pageData.hasMetaDescription,
      hasH1: pageData.hasH1,
      hasOpenGraph: pageData.hasOpenGraph,
      hasSitemap: sitemapOk,
      hasRobotsTxt: robotsOk,
      hasCanonical: pageData.hasCanonical,
    })
    const mobileScore = calcMobileScore({ hasViewportMeta: pageData.hasViewportMeta, isResponsive })
    const performanceScore = calcPerfScore(loadTimeSec)

    // ── Issues ───────────────────────────────────────────────────────────────
    const issues = buildIssues({
      hasSSL,
      loadTimeSec,
      isResponsive,
      hasViewportMeta: pageData.hasViewportMeta,
      hasTitle: !!pageData.title,
      hasMetaDescription: pageData.hasMetaDescription,
      hasH1: pageData.hasH1,
      hasOpenGraph: pageData.hasOpenGraph,
      hasSitemap: sitemapOk,
      hasRobotsTxt: robotsOk,
      hasMentionsLegales: pageData.hasMentionsLegales,
      imagesWithoutAlt: pageData.imagesWithoutAlt,
      cms,
      designAge,
      techStack,
    })

    // ── Page size estimate ────────────────────────────────────────────────────
    const pageSize = Math.round(pageData.htmlLength / 1024)

    return {
      url: normalizedUrl,
      scannedAt,
      mobileScore,
      seoScore,
      performanceScore,
      loadTimeSec: Math.round(loadTimeSec * 10) / 10,
      pageSize,
      hasSSL,
      isResponsive,
      hasViewportMeta: pageData.hasViewportMeta,
      hasTitle: !!pageData.title,
      title: pageData.title,
      hasMetaDescription: pageData.hasMetaDescription,
      metaDescription: pageData.metaDescription,
      hasH1: pageData.hasH1,
      h1Text: pageData.h1Text,
      hasOpenGraph: pageData.hasOpenGraph,
      hasSitemap: sitemapOk,
      hasRobotsTxt: robotsOk,
      hasCanonical: pageData.hasCanonical,
      hasMentionsLegales: pageData.hasMentionsLegales,
      cms,
      techStack,
      designAge,
      imagesWithoutAlt: pageData.imagesWithoutAlt,
      issues,
      screenshotDesktop,
      screenshotMobile,
    }

  } finally {
    await browser.close()
  }
}
