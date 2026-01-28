import { withAccelerate } from '@prisma/extension-accelerate'

// Helper to safely get env var without quotes
function getEnv(key: string): string {
    const val = process.env[key] || ''
    return val.replace(/^[\"']|[\"']$/g, '')
}

// Determine which database to use based on environment
const dbUrl = getEnv('DATABASE_URL')
const sqliteUrl = getEnv('SQLITE_DATABASE_URL')

// Check if DATABASE_URL is a PostgreSQL URL
const isPostgresUrl = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')

// Check if DATABASE_URL is a SQLite file URL (for Electron builds)
const isSqliteUrl = dbUrl.startsWith('file:')

// Use SQLite if:
// 1. DATABASE_URL starts with 'file:' (Electron .env.electron)
// 2. OR SQLITE_DATABASE_URL is set and DATABASE_URL is NOT postgres
export const isPostgres = isPostgresUrl && !isSqliteUrl
export const useSqlite = isSqliteUrl || (sqliteUrl.startsWith('file:') && !isPostgresUrl)

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
    console.log('[Prisma] DB Detection:', {
        dbUrl: dbUrl.substring(0, 30) + '...',
        isPostgres,
        useSqlite,
        isSqliteUrl
    })
}

// Global cache for prisma clients
const globalForPrisma = globalThis as unknown as {
    prisma: any
}

function createPrismaClient() {
    if (isPostgres) {
        // Vercel / Web Mode: Use the STANDARD @prisma/client (Postgres)
        console.log('[Prisma] Using PostgreSQL client')
        const { PrismaClient } = require('@prisma/client')
        return new PrismaClient({
            datasourceUrl: dbUrl,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        })
    } else {
        // Desktop / Electron Mode: Use the CUSTOM @prisma/client-sqlite
        console.log('[Prisma] Using SQLite client')
        try {
            const { PrismaClient: SqliteClient } = require('@prisma/client-sqlite')

            // Use DATABASE_URL if it's a file URL, otherwise use SQLITE_DATABASE_URL
            const sqliteDbUrl = isSqliteUrl ? dbUrl : sqliteUrl
            console.log('[Prisma] SQLite URL:', sqliteDbUrl)

            const client = new SqliteClient({
                datasourceUrl: sqliteDbUrl,
                log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
            })

            // Add extensions to handle type mismatches between Postgres (Json/Array) and SQLite (String)
            return client.$extends({
                result: {
                    order: {
                        items: {
                            needs: { items: true },
                            compute(order: any) {
                                try {
                                    return order.items ? JSON.parse(order.items) : []
                                } catch (e) {
                                    return []
                                }
                            }
                        }
                    },
                    user: {
                        disabledModules: {
                            needs: { disabledModules: true },
                            compute(user: any) {
                                return user.disabledModules ? user.disabledModules.split(',').filter(Boolean) : []
                            }
                        }
                    }
                },
                query: {
                    order: {
                        async create({ args, query }: any) {
                            if (args.data.items && typeof args.data.items !== 'string') {
                                args.data.items = JSON.stringify(args.data.items)
                            }
                            return query(args)
                        },
                        async update({ args, query }: any) {
                            if (args.data.items && typeof args.data.items !== 'string') {
                                args.data.items = JSON.stringify(args.data.items)
                            }
                            return query(args)
                        }
                    },
                    user: {
                        async create({ args, query }: any) {
                            if (Array.isArray(args.data.disabledModules)) {
                                args.data.disabledModules = args.data.disabledModules.join(',')
                            }
                            return query(args)
                        },
                        async update({ args, query }: any) {
                            if (Array.isArray(args.data.disabledModules)) {
                                args.data.disabledModules = args.data.disabledModules.join(',')
                            }
                            return query(args)
                        }
                    }
                }
            }).$extends(withAccelerate())
        } catch (e) {
            console.error("[Prisma] Failed to load SQLite client:", e)
            console.error("Run 'npx prisma generate --schema=prisma/schema.prisma'")
            throw e
        }
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
