import { withAccelerate } from '@prisma/extension-accelerate'

// Helper to safely get env var without quotes
function getEnv(key: string): string {
    const val = process.env[key] || ''
    return val.replace(/^["']|["']$/g, '')
}

// Determine which database to use based on environment
const dbUrl = getEnv('DATABASE_URL')
const sqliteUrl = getEnv('SQLITE_DATABASE_URL')

// Check if we should use PostgreSQL (web mode) or SQLite (desktop mode)
export const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')
export const useSqlite = sqliteUrl.startsWith('file:') && !isPostgres

// Global cache for prisma clients
const globalForPrisma = globalThis as unknown as {
    prisma: any
}

function createPrismaClient() {
    if (isPostgres) {
        // Dynamic import to avoid loading SQLite bindings in Vercel
        const { PrismaClient: PostgresClient } = require('@prisma/client-postgres')
        return new PostgresClient({
            datasourceUrl: dbUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        })
    } else {
        // SQLite mode
        const { PrismaClient: SqliteClient } = require('@prisma/client')
        const client = new SqliteClient({
            datasourceUrl: useSqlite ? sqliteUrl : (dbUrl || sqliteUrl),
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        })
        return client.$extends(withAccelerate())
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


