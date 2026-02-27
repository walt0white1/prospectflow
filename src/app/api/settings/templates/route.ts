import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ templates })
  } catch {
    return NextResponse.json({ templates: [] })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { name, subject, body, type } = await req.json()

    if (!name || !subject || !body) {
      return NextResponse.json({ message: 'Champs requis manquants' }, { status: 400 })
    }

    const template = await (prisma.emailTemplate as any).create({
      data: { name, subject, body, type: type ?? 'FIRST_CONTACT', userId },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Erreur lors de la création' }, { status: 500 })
  }
}
