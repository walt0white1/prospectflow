import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient | undefined {
  try {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) return undefined
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter } as any)
  } catch {
    return undefined
  }
}

// Cast to PrismaClient — callers have try-catch that handles runtime errors when DB is absent
export const prisma = (
  globalForPrisma.prisma ?? createPrismaClient()
) as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  ;(globalForPrisma as any).prisma = prisma
}
