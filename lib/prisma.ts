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
        // Vercel / Web Mode: Use the STANDARD @prisma/client (Postgres)
        // Vercel automatically bundles the engine for the default client.
        const { PrismaClient } = require('@prisma/client')
        return new PrismaClient({
            datasourceUrl: dbUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        })
    } else {
        // Desktop / Electron Mode: Use the CUSTOM @prisma/client-sqlite
        // This client is generated into node_modules/@prisma/client-sqlite
        try {
            const { PrismaClient: SqliteClient } = require('@prisma/client-sqlite')
            const client = new SqliteClient({
                datasourceUrl: useSqlite ? sqliteUrl : (dbUrl || sqliteUrl),
                log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
            })
            return client.$extends(withAccelerate())
        } catch (e) {
            console.error("Failed to load SQLite client. Run 'npx prisma generate --schema=prisma/schema.prisma'")
            throw e
        }
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


