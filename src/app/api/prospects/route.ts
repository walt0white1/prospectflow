import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MOCK_PROSPECTS, type MockProspect } from '@/lib/mock-prospects'

// ── POST /api/prospects — Sauvegarder un prospect depuis la recherche ─────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const {
    companyName, industry, city,
    website, hasWebsite, phone, email, address,
    lat, lng, osmId,
    prospectScore, priority, source,
    issues, googleRating, googleReviewCount,
  } = body

  if (!companyName || !industry || !city) {
    return NextResponse.json(
      { error: 'Champs obligatoires manquants : companyName, industry, city' },
      { status: 400 },
    )
  }

  try {
    const existing = await (prisma.prospect as any).findFirst({
      where: {
        userId,
        OR: [
          ...(osmId ? [{ osmId }] : []),
          {
            companyName: { equals: companyName, mode: 'insensitive' },
            city: { equals: city, mode: 'insensitive' },
          },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ce prospect existe déjà dans le CRM', id: existing.id },
        { status: 409 },
      )
    }

    const prospect = await (prisma.prospect as any).create({
      data: {
        userId,
        companyName,
        industry,
        city,
        website: (website as string) ?? null,
        hasWebsite: (hasWebsite as boolean) ?? false,
        phone: (phone as string) ?? null,
        email: (email as string) ?? null,
        address: (address as string) ?? null,
        lat: (lat as number) ?? null,
        lng: (lng as number) ?? null,
        osmId: (osmId as string) ?? null,
        prospectScore: (prospectScore as number) ?? 0,
        priority: (priority as string) ?? 'MEDIUM',
        status: 'NEW',
        source: (source as string) ?? 'OPENSTREETMAP',
        issues: (issues as string[]) ?? [],
        googleRating: (googleRating as number) ?? null,
        googleReviewCount: (googleReviewCount as number) ?? null,
      },
    })

    return NextResponse.json(prospect, { status: 201 })
  } catch {
    return NextResponse.json(
      { id: `mock-${Date.now()}`, ...body, _mock: true },
      { status: 201 },
    )
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  const sp = req.nextUrl.searchParams
  const page     = Math.max(1, Number(sp.get('page')  ?? '1'))
  const limit    = Math.max(1, Number(sp.get('limit') ?? '20'))
  const search   = sp.get('search')   ?? ''
  const status   = sp.get('status')   ?? ''
  const priority = sp.get('priority') ?? ''
  const source   = sp.get('source')   ?? ''
  const city     = sp.get('city')     ?? ''
  const scoreMin = Number(sp.get('scoreMin') ?? '0')
  const scoreMax = Number(sp.get('scoreMax') ?? '100')
  const sortBy   = sp.get('sortBy')   ?? 'prospectScore'
  const sortDir  = sp.get('sortDir')  ?? 'desc'

  // ── Try real DB ─────────────────────────────────────────────────────────────
  try {
    const where: Record<string, unknown> = {
      userId,
      prospectScore: { gte: scoreMin, lte: scoreMax },
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status)   where.status   = status
    if (priority) where.priority = priority
    if (source)   where.source   = source
    if (city)     where.city     = { contains: city, mode: 'insensitive' }

    const validSortFields: Record<string, boolean> = {
      prospectScore: true, companyName: true, city: true, createdAt: true, lastContactAt: true,
    }
    const orderBy = validSortFields[sortBy]
      ? { [sortBy]: sortDir as 'asc' | 'desc' }
      : { prospectScore: 'desc' as const }

    const [prospects, total] = await Promise.all([
      (prisma.prospect as any).findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { _count: { select: { notes: true, emails: true } } },
      }),
      (prisma.prospect as any).count({ where }),
    ])

    return NextResponse.json({ prospects, total, page, limit, source: 'db' })
  } catch {
    // ── Fall back to mock data ────────────────────────────────────────────────
    let list = [...MOCK_PROSPECTS] as MockProspect[]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.companyName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.firstName ?? '').toLowerCase().includes(q) ||
        (p.lastName ?? '').toLowerCase().includes(q),
      )
    }
    if (status)   list = list.filter(p => p.status === status)
    if (priority) list = list.filter(p => p.priority === priority)
    if (source)   list = list.filter(p => p.source === source)
    if (city)     list = list.filter(p => p.city.toLowerCase().includes(city.toLowerCase()))
    list = list.filter(p => p.prospectScore >= scoreMin && p.prospectScore <= scoreMax)

    list.sort((a, b) => {
      const av = a[sortBy as keyof MockProspect]
      const bv = b[sortBy as keyof MockProspect]
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'desc' ? bv - av : av - bv
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
      if (av === null) return 1
      if (bv === null) return -1
      return 0
    })

    const total = list.length
    const paginated = list.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ prospects: paginated, total, page, limit, source: 'mock' })
  }
}
