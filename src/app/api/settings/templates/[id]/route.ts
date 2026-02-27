import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { name, subject, body, type } = await req.json()

    const template = await (prisma.emailTemplate as any).update({
      where: { id, userId: session.user.id },
      data: { name, subject, body, type },
    })

    return NextResponse.json({ template })
  } catch {
    return NextResponse.json({ message: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  try {
    const { id } = await params

    await (prisma.emailTemplate as any).delete({ where: { id, userId: session.user.id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ message: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
