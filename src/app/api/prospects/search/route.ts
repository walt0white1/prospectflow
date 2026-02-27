// ── POST /api/prospects/search ────────────────────────────────────────────────
// Pipeline SSE : Nominatim → Overpass → scoring → (optionnel) GMaps enrichment
//
// Format des événements SSE :
//   event: geocode   data: { city, lat, lng }
//   event: overpass  data: { count }
//   event: scored    data: ScoredProspect[]
//   event: enrich    data: { index, total, name }
//   event: done      data: ScoredProspect[] (final, avec enrichissements)
//   event: error     data: { message }

import { NextRequest } from 'next/server'
import { geocodeCity } from '@/lib/overpass'
import { searchOverpass } from '@/lib/overpass'
import { scoreAndSort } from '@/lib/scoring'
import type { ScoredProspect } from '@/lib/scoring'
import { SECTORS } from '@/lib/sectors'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel max 60s pour les routes edge

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(eventName: string, data: unknown): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
}

// ── Request body type ─────────────────────────────────────────────────────────

type SearchBody = {
  sector: string        // osmValue du secteur (ex: 'hairdresser')
  city: string          // Nom de la ville
  radiusKm?: number     // default 5
  limit?: number        // default 50
  enrichGmaps?: boolean // default false (Playwright activé)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: SearchBody

  try {
    body = await req.json()
  } catch {
    return new Response(
      sseEvent('error', { message: 'Corps de requête invalide (JSON attendu)' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const { sector: sectorValue, city, radiusKm = 5, limit = 50, enrichGmaps = false } = body

  if (!sectorValue || !city) {
    return new Response(
      sseEvent('error', { message: 'Paramètres manquants : sector, city' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const sector = SECTORS.find(s => s.osmValue === sectorValue || s.label === sectorValue)
  if (!sector) {
    return new Response(
      sseEvent('error', { message: `Secteur inconnu : ${sectorValue}` }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  // ── Créer le ReadableStream SSE ──────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventName: string, data: unknown) => {
        try {
          controller.enqueue(new TextEncoder().encode(sseEvent(eventName, data)))
        } catch {
          // Client déconnecté
        }
      }

      try {
        // ── 1. Géocodage Nominatim ─────────────────────────────────────────
        send('status', { step: 'geocode', message: `Géocodage de "${city}"…` })

        const geoPoint = await geocodeCity(city)
        if (!geoPoint) {
          send('error', { message: `Ville introuvable : "${city}". Essayez un nom de ville français valide.` })
          controller.close()
          return
        }

        send('geocode', {
          city: geoPoint.city,
          displayName: geoPoint.displayName,
          lat: geoPoint.lat,
          lng: geoPoint.lng,
        })

        // ── 2. Recherche Overpass ──────────────────────────────────────────
        send('status', {
          step: 'overpass',
          message: `Recherche "${sector.label}" dans un rayon de ${radiusKm} km autour de ${geoPoint.city}…`,
        })

        const rawProspects = await searchOverpass({
          sector,
          lat: geoPoint.lat,
          lng: geoPoint.lng,
          city: geoPoint.city,
          radiusKm,
          limit,
        })

        send('overpass', { count: rawProspects.length })

        if (rawProspects.length === 0) {
          send('done', [])
          controller.close()
          return
        }

        // ── 3. Scoring ────────────────────────────────────────────────────
        send('status', { step: 'scoring', message: 'Calcul des scores…' })

        const scored: ScoredProspect[] = scoreAndSort(rawProspects)
        send('scored', scored)

        // ── 4. Enrichissement Google Maps (optionnel) ──────────────────────
        if (!enrichGmaps) {
          send('done', scored)
          controller.close()
          return
        }

        // Limiter l'enrichissement GMaps aux 20 premiers prospects (HOT/HIGH)
        const toEnrich = scored.slice(0, 20)
        const notEnriched = scored.slice(20)

        send('status', {
          step: 'enrich',
          message: `Enrichissement Google Maps (${toEnrich.length} prospects)…`,
        })

        // Import dynamique du module Playwright (server-only)
        const { enrichBatch } = await import('@/lib/gmaps-enricher')

        const enrichResults = await enrichBatch(
          toEnrich.map(p => ({ name: p.name, city: p.city })),
          (index, total) => {
            const prospect = toEnrich[index - 1]
            send('enrich', {
              index,
              total,
              name: prospect?.name ?? '',
            })
          },
        )

        // Fusionner les résultats enrichis
        const enriched: ScoredProspect[] = toEnrich.map((p, i) => {
          const gmaps = enrichResults[i]
          if (!gmaps) return p

          // Compléter les champs manquants avec les données GMaps
          return {
            ...p,
            googleRating: gmaps.googleRating ?? null,
            googleReviewCount: gmaps.googleReviewCount ?? null,
            // Priorité au site web OSM, puis GMaps si OSM n'en a pas
            website: p.website ?? gmaps.website ?? null,
            hasWebsite: !!(p.website ?? gmaps.website),
            // Priorité au téléphone OSM, puis GMaps
            phone: p.phone ?? gmaps.phone ?? null,
            // Adresse Google si OSM n'en a pas
            address: p.address ?? gmaps.address ?? null,
          }
        })

        // Remettre dans l'ordre (avec les non-enrichis à la fin)
        const final: ScoredProspect[] = [...enriched, ...notEnriched]

        send('done', final)
        controller.close()

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        send('error', { message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Désactiver le buffering nginx
    },
  })
}
