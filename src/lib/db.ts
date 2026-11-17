import { PrismaClient } from '@prisma/client'

// Use global to avoid creating multiple instances in dev
// but create fresh if the existing one is invalid (Turbopack issue workaround)
const globalForPrisma = globalThis as unknown as {
  __db: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

// Always create a fresh client if one doesn't exist, or reuse the global one
if (!globalForPrisma.__db) {
  globalForPrisma.__db = createPrismaClient()
}

export const db = globalForPrisma.__db
