import { PrismaClient as SqliteClient } from '@prisma/client'
import { PrismaClient as PostgresClient } from '@prisma/client-postgres'
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
// Check if we should use PostgreSQL (web mode) or SQLite (desktop mode)
export const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')
export const useSqlite = sqliteUrl.startsWith('file:') && !isPostgres

// Global cache for prisma clients
const globalForPrisma = globalThis as unknown as {
    prisma: any
}

function createPrismaClient() {
    // console.log(`[Prisma] Creating client. isPostgres: ${isPostgres}, useSqlite: ${useSqlite}`)
    if (isPostgres) {
        // console.log(`[Prisma] Initializing PostgreSQL client with URL: ${dbUrl.substring(0, 20)}...`)
        return new PostgresClient({
            datasourceUrl: dbUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        })
    } else if (useSqlite) {
        // console.log(`[Prisma] Initializing SQLite client with URL: ${sqliteUrl}`)
        return new SqliteClient({
            datasourceUrl: sqliteUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }).$extends(withAccelerate())
    } else {
        // console.log(`[Prisma] Initializing Fallback SQLite client with URL: ${dbUrl || sqliteUrl}`)
        return new SqliteClient({
            datasourceUrl: dbUrl || sqliteUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }).$extends(withAccelerate())
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


