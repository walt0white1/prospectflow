// ── Overpass API + Nominatim geocoding ───────────────────────────────────────
// 100% gratuit, sans clé API.
// Nominatim : https://nominatim.openstreetmap.org/search
// Overpass  : https://overpass-api.de/api/interpreter

import type { Sector } from './sectors'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeoPoint = {
  lat: number
  lng: number
  city: string         // Nom normalisé retourné par Nominatim
  displayName: string  // Nom complet (ex: "Lyon, Métropole de Lyon, France")
}

export type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number          // Présent sur node
  lon?: number          // Présent sur node
  center?: {            // Présent sur way/relation
    lat: number
    lon: number
  }
  tags?: Record<string, string>
}

export type OverpassProspect = {
  osmId: string
  osmType: 'node' | 'way' | 'relation'
  name: string
  lat: number
  lng: number
  address: string | null
  phone: string | null
  website: string | null
  hasWebsite: boolean
  email: string | null
  openingHours: string | null
  industry: string       // Label humain du secteur
  city: string           // Ville normalisée (depuis le geocoding)
  rawTags: Record<string, string>
  // Champs optionnels ajoutés par l'enrichissement Google Maps
  googleRating?: number | null
  googleReviewCount?: number | null
}

// ── Nominatim geocoding ───────────────────────────────────────────────────────

/**
 * Géocode une ville française via Nominatim (OpenStreetMap).
 * Retourne null si la ville est introuvable.
 */
export async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', city)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('countrycodes', 'fr')

  const res = await fetch(url.toString(), {
    headers: {
      // Nominatim exige un User-Agent identifiant l'application
      'User-Agent': 'ProspectFlow/1.0 (contact@prospectflow.fr)',
      'Accept-Language': 'fr,en;q=0.9',
      'Referer': process.env.APP_URL ?? 'http://localhost:3000',
    },
    // Ne pas mettre de cache pour respecter la politique de Nominatim
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)

  const data = await res.json() as Array<{
    lat: string
    lon: string
    display_name: string
    address?: { city?: string; town?: string; village?: string; municipality?: string }
  }>

  if (!data.length) return null

  const first = data[0]
  const addr = first.address ?? {}
  const normalizedCity =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? city

  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    city: normalizedCity,
    displayName: first.display_name,
  }
}

// ── Overpass query builder ────────────────────────────────────────────────────

/**
 * Construit une requête Overpass QL pour un secteur + zone géographique.
 * Utilise `around:<radius>,<lat>,<lon>` pour chercher dans un rayon.
 */
function buildOverpassQuery(
  sector: Sector,
  lat: number,
  lng: number,
  radiusMeters: number,
): string {
  const around = `around:${radiusMeters},${lat},${lng}`
  const outFmt = 'out center tags;'

  // Tag principal
  const mainTag = `["${sector.osmKey}"="${sector.osmValue}"]`

  // Construction de l'union si tags alternatifs
  const parts: string[] = [
    `node${mainTag}(${around});`,
    `way${mainTag}(${around});`,
    `relation${mainTag}(${around});`,
  ]

  if (sector.altTags) {
    for (const alt of sector.altTags) {
      const altTag = `["${alt.key}"="${alt.value}"]`
      parts.push(
        `node${altTag}(${around});`,
        `way${altTag}(${around});`,
        `relation${altTag}(${around});`,
      )
    }
  }

  return `[out:json][timeout:25];\n(\n  ${parts.join('\n  ')}\n);\n${outFmt}`
}

// ── Overpass API call ─────────────────────────────────────────────────────────

/**
 * Appelle l'API Overpass et retourne les éléments bruts.
 */
async function queryOverpassRaw(query: string): Promise<OverpassElement[]> {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ProspectFlow/1.0 (prospectflow@example.com)',
    },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as { elements: OverpassElement[] }
  return json.elements ?? []
}

// ── Element → OverpassProspect ────────────────────────────────────────────────

function elementToProspect(
  el: OverpassElement,
  sector: Sector,
  city: string,
): OverpassProspect | null {
  const tags = el.tags ?? {}

  // Ignorer si pas de nom
  const name = tags['name'] ?? tags['brand'] ?? tags['operator']
  if (!name) return null

  // Coordonnées
  let lat: number
  let lng: number
  if (el.lat !== undefined && el.lon !== undefined) {
    lat = el.lat
    lng = el.lon
  } else if (el.center) {
    lat = el.center.lat
    lng = el.center.lon
  } else {
    return null
  }

  // Adresse (concaténation des tags addr:*)
  const street = tags['addr:street'] ?? null
  const housenumber = tags['addr:housenumber'] ?? null
  const postcode = tags['addr:postcode'] ?? null
  const addressCity = tags['addr:city'] ?? null

  let address: string | null = null
  if (street) {
    const parts: string[] = []
    if (housenumber) parts.push(housenumber)
    parts.push(street)
    if (postcode || addressCity) {
      parts.push(`${postcode ?? ''} ${addressCity ?? ''}`.trim())
    }
    address = parts.join(', ')
  }

  const website = tags['website'] ?? tags['contact:website'] ?? tags['url'] ?? null
  const phone = tags['phone'] ?? tags['contact:phone'] ?? tags['telephone'] ?? null
  const email = tags['email'] ?? tags['contact:email'] ?? null
  const openingHours = tags['opening_hours'] ?? null

  return {
    osmId: `${el.type}/${el.id}`,
    osmType: el.type,
    name,
    lat,
    lng,
    address,
    phone,
    website,
    hasWebsite: !!website,
    email,
    openingHours,
    industry: sector.label,
    city,
    rawTags: tags,
  }
}

// ── Déduplication ─────────────────────────────────────────────────────────────

/**
 * Déduplique par osmId (un même lieu peut apparaître via plusieurs tags).
 */
function deduplicateProspects(prospects: OverpassProspect[]): OverpassProspect[] {
  const seen = new Set<string>()
  const result: OverpassProspect[] = []
  for (const p of prospects) {
    if (!seen.has(p.osmId)) {
      seen.add(p.osmId)
      result.push(p)
    }
  }
  return result
}

// ── Main search function ──────────────────────────────────────────────────────

export type SearchOverpassOptions = {
  sector: Sector
  lat: number
  lng: number
  city: string
  radiusKm?: number      // default 5 km
  limit?: number         // default 50
}

/**
 * Cherche des entreprises dans une zone via Overpass API.
 * Retourne les prospects formatés, dédupliqués, limités à `limit`.
 */
export async function searchOverpass(
  opts: SearchOverpassOptions,
): Promise<OverpassProspect[]> {
  const {
    sector,
    lat,
    lng,
    city,
    radiusKm = 5,
    limit = 50,
  } = opts

  const radiusMeters = radiusKm * 1000
  const query = buildOverpassQuery(sector, lat, lng, radiusMeters)
  const elements = await queryOverpassRaw(query)

  const prospects: OverpassProspect[] = []
  for (const el of elements) {
    const p = elementToProspect(el, sector, city)
    if (p) prospects.push(p)
  }

  const deduped = deduplicateProspects(prospects)
  return deduped.slice(0, limit)
}
