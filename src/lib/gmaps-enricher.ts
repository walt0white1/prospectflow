// ── Google Maps enricher via Playwright headless ──────────────────────────────
// IMPORTANT : Ce module est SERVER-ONLY (Node.js).
// Ne jamais l'importer côté client — utiliser dynamic import ou 'server-only'.
//
// Stratégie anti-détection :
//  - Délai aléatoire 2–4s entre chaque requête
//  - Un seul browser réutilisé pour tout le batch
//  - Blocage des ressources inutiles (images, fonts, media)
//  - User-Agent réaliste

export type GmapsData = {
  googleRating: number | null
  googleReviewCount: number | null
  website: string | null     // Site détecté sur GMaps (peut compléter OSM)
  phone: string | null       // Numéro tel affiché sur la fiche GMaps
  address: string | null     // Adresse formatée par Google
  isOpen: boolean | null     // null si non déterminable
  gmapsUrl: string           // URL de la fiche Google Maps
}

// ── Délai aléatoire ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(minMs = 2000, maxMs = 4000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return sleep(ms)
}

// ── Extraction Google Maps ─────────────────────────────────────────────────────

/**
 * Enrichit une fiche depuis Google Maps.
 * @param page - Page Playwright déjà ouverte et configurée
 * @param name - Nom de l'entreprise
 * @param city - Ville
 */
async function enrichOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any, // Page Playwright — any pour éviter les imports côté serveur
  name: string,
  city: string,
): Promise<GmapsData> {
  const query = encodeURIComponent(`${name} ${city}`)
  const searchUrl = `https://www.google.com/maps/search/${query}`
  const gmapsUrl = searchUrl

  try {
    // Navigation vers la fiche Google Maps
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

    // Attendre que la page charge quelque chose d'utile
    await page.waitForTimeout(2000)

    // Fermer les popups de consentement Google si présents
    const consentButton = page.locator(
      'button:has-text("Tout accepter"), button:has-text("Accept all"), button[aria-label="Accept all"]',
    )
    if (await consentButton.first().isVisible().catch(() => false)) {
      await consentButton.first().click()
      await page.waitForTimeout(1000)
    }

    // Attendre que les résultats apparaissent (fiche ou liste)
    await page.waitForSelector('[data-value], [aria-label*="étoile"], [aria-label*="star"], .fontBodyMedium', {
      timeout: 8000,
    }).catch(() => null)

    // ── Extraction des données ───────────────────────────────────────────────

    const data = await page.evaluate(() => {
      // Note / Rating
      const ratingEl = document.querySelector('[aria-label*="étoile"], [aria-label*="star"], [data-value]')
      let rating: number | null = null
      if (ratingEl) {
        const label = ratingEl.getAttribute('aria-label') ?? ratingEl.getAttribute('data-value') ?? ''
        const m = label.match(/(\d+[,.]?\d*)/)
        if (m) rating = parseFloat(m[1].replace(',', '.'))
      }

      // Nombre d'avis
      let reviewCount: number | null = null
      const reviewEls = document.querySelectorAll('[aria-label*="avis"], [aria-label*="review"]')
      for (const el of Array.from(reviewEls)) {
        const label = el.getAttribute('aria-label') ?? ''
        const m = label.match(/(\d[\d\s]*)/)
        if (m) {
          reviewCount = parseInt(m[1].replace(/\s/g, ''), 10)
          break
        }
      }

      // Numéro de téléphone
      let phone: string | null = null
      const telLinks = document.querySelectorAll('a[href^="tel:"]')
      if (telLinks.length > 0) {
        phone = telLinks[0].getAttribute('href')?.replace('tel:', '') ?? null
      }

      // Site web
      let website: string | null = null
      const webLinks = document.querySelectorAll('a[data-tooltip="Ouvrir le site Web"], a[aria-label*="site"], a[data-item-id="authority"]')
      if (webLinks.length > 0) {
        website = webLinks[0].getAttribute('href') ?? null
        // Nettoyer les redirections Google (google.com/url?q=...)
        if (website?.includes('google.com/url')) {
          try {
            const u = new URL(website)
            website = u.searchParams.get('q') ?? website
          } catch {
            // garder tel quel
          }
        }
      }

      // Adresse
      let address: string | null = null
      const addrEl = document.querySelector('[data-item-id="address"] .fontBodyMedium, [aria-label*="Adresse"] .fontBodyMedium')
      if (addrEl) {
        address = addrEl.textContent?.trim() ?? null
      }

      return { rating, reviewCount, phone, website, address }
    })

    return {
      googleRating: data.rating,
      googleReviewCount: data.reviewCount,
      website: data.website,
      phone: data.phone,
      address: data.address,
      isOpen: null,
      gmapsUrl,
    }
  } catch {
    // En cas d'erreur → retourner des nulls (enrichissement optionnel)
    return {
      googleRating: null,
      googleReviewCount: null,
      website: null,
      phone: null,
      address: null,
      isOpen: null,
      gmapsUrl,
    }
  }
}

// ── Batch enrichment ──────────────────────────────────────────────────────────

export type EnrichTarget = {
  name: string
  city: string
}

export type EnrichResult = EnrichTarget & GmapsData

/**
 * Enrichit un lot de prospects via Google Maps (Playwright headless).
 * Lance un seul browser pour tout le batch.
 * Délai aléatoire 2–4s entre chaque requête.
 *
 * @param targets - Liste de {name, city} à enrichir
 * @param onProgress - Callback appelé après chaque enrichissement (index, total)
 */
export async function enrichBatch(
  targets: EnrichTarget[],
  onProgress?: (index: number, total: number) => void,
): Promise<EnrichResult[]> {
  if (targets.length === 0) return []

  // Import dynamique pour éviter de bundler Playwright côté client
  const { chromium } = await import('playwright')

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=VizDisplayCompositor',
    ],
  })

  const context = await browser.newContext({
    // User-Agent Chrome récent pour passer les détections basiques
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris par défaut
    permissions: ['geolocation'],
  })

  // Bloquer les ressources inutiles pour accélérer
  await context.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,webm}', route => {
    route.abort()
  })

  const page = await context.newPage()
  const results: EnrichResult[] = []

  try {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]

      const gmapsData = await enrichOne(page, target.name, target.city)
      results.push({ ...target, ...gmapsData })

      onProgress?.(i + 1, targets.length)

      // Délai anti-blocage entre les requêtes (sauf après la dernière)
      if (i < targets.length - 1) {
        await randomDelay(2000, 4000)
      }
    }
  } finally {
    await browser.close()
  }

  return results
}
