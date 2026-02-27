import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Mot de passe trop court (min 8 caractères)' },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: name?.trim() || null, email, password: hashed },
    })

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Erreur serveur. Vérifiez que la base de données est configurée.' },
      { status: 500 },
    )
  }
}
