'use server'

import { prisma, isPostgres } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { MongoClient } from 'mongodb'

// MongoDB Client for reading logs
const uri = process.env.MONGODB_LOG_URI
let mongoClient: MongoClient | null = null

async function getMongoClient() {
    if (!uri) return null
    if (!mongoClient) {
        mongoClient = new MongoClient(uri)
        await mongoClient.connect()
    }
    return mongoClient
}

const getDbName = (connectionUri: string): string => {
    try {
        const url = new URL(connectionUri);
        const pathDb = url.pathname.replace('/', '');
        return pathDb || 'syncserve_audit';
    } catch {
        return 'syncserve_audit';
    }
};

interface GetLogsParams {
    page?: number
    limit?: number
    module?: string
    userId?: string
    startDate?: string
    endDate?: string
    search?: string
}

export async function getActivityLogs({
    page = 1,
    limit = 20,
    module,
    userId,
    startDate,
    endDate,
    search
}: GetLogsParams) {
    const user = await getUserProfile()
    if (!user) return { logs: [], total: 0, totalPages: 0 }

    try {
        // WEB MODE (PostgreSQL): Read from MongoDB
        if (isPostgres && uri) {
            const client = await getMongoClient()
            if (!client) return { logs: [], total: 0, totalPages: 0 }

            const dbName = getDbName(uri)
            const db = client.db(dbName)
            const collection = db.collection('audit_logs')

            const query: any = {}

            if (module && module !== 'ALL') query.module = module
            if (userId && userId !== 'ALL') query.userId = userId

            if (startDate || endDate) {
                query.createdAt = {} // Note: Ensure 'createdAt' or 'localCreatedAt' matches your mongo schema
                // Actually, mongo-logger uses 'syncedAt' or spread ...logEntry. 
                // Let's assume 'createdAt' exists if it was in the logEntry, or use 'syncedAt'.
                // The logEntry usually has 'localCreatedAt' passed from audit.ts.

                // Let's check mongo-logger.ts -> `...logEntry` is passed. 
                // In audit.ts: `localCreatedAt: savedLog?.createdAt`.
                // In logger.ts: `localCreatedAt: log?.createdAt`.
                // But `createdAt` field might not be top-level if not explicitly passed. 
                // Let's use `localCreatedAt` for consistency or `syncedAt`.
                // However, detailed logs from audit.ts don't duplicate `createdAt` unless it was in `entry`.
                // Ideally we use `syncedAt` (when it reached cloud) or fallback.
                if (startDate) query.syncedAt = { $gte: new Date(startDate) }
                if (endDate) {
                    const end = new Date(endDate)
                    end.setHours(23, 59, 59, 999)
                    query.syncedAt = { ...query.syncedAt, $lte: end }
                }
            }

            if (search) {
                query.$or = [
                    { action: { $regex: search, $options: 'i' } },
                    { details: { $regex: search, $options: 'i' } },
                    { module: { $regex: search, $options: 'i' } },
                    { reason: { $regex: search, $options: 'i' } }
                ]
            }

            const skip = (page - 1) * limit

            const total = await collection.countDocuments(query)
            const logs = await collection.find(query)
                .sort({ syncedAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray()

            // Map MongoDB _id to string id and ensure user object structure if possible
            // We can't join with SQL users easily here. 
            // Ideally we store username/role in the log itself.
            // For now, we return logs directly. The UI might show userId if user not found.

            return {
                logs: logs.map(log => ({
                    ...log,
                    id: log._id.toString(),
                    createdAt: log.localCreatedAt || log.syncedAt, // Prefer original time
                    user: { username: log.userId || 'Unknown', role: 'N/A' } // Placeholder as we can't join cross-db easily without n+1
                })),
                total,
                totalPages: Math.ceil(total / limit)
            }
        }

        // DESKTOP MODE (SQLite) or Web fallback if Mongo missing: Read from Local SQL
        else {
            const where: any = {}

            if (module && module !== 'ALL') where.module = module
            if (userId && userId !== 'ALL') where.userId = userId

            if (startDate || endDate) {
                where.createdAt = {}
                if (startDate) where.createdAt.gte = new Date(startDate)
                if (endDate) {
                    const end = new Date(endDate)
                    end.setHours(23, 59, 59, 999)
                    where.createdAt.lte = end
                }
            }

            if (search) {
                const searchFilter = { contains: search } // SQLite is case-insensitive by default in Prisma?
                where.OR = [
                    { action: searchFilter },
                    { module: searchFilter },
                    { user: { username: searchFilter } }
                ]
                // Add conditional fields based on model
                if (isPostgres) {
                    where.OR.push({ details: searchFilter })
                } else {
                    where.OR.push({ reason: searchFilter })
                }
            }

            const skip = (page - 1) * limit

            // dynamic model selection
            // dynamic model selection
            // Note: ActivityLog model was removed from Postgres schema.
            // If we are here in Postgres mode, it means Mongo failed or logic fell through.
            // We can only query AuditLog (SQLite) which only exists in Desktop mode.

            const modelDelegate = isPostgres ? null : prisma.auditLog;

            if (!modelDelegate) {
                return { logs: [], total: 0, totalPages: 0 }
            }

            // @ts-ignore - dynamic model access
            const [logs, total] = await prisma.$transaction([
                modelDelegate.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip,
                    include: {
                        user: {
                            select: { username: true, role: true }
                        }
                    }
                }),
                modelDelegate.count({ where })
            ])

            return {
                logs,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }

    } catch (error) {
        console.error("Failed to fetch logs", error)
        return { logs: [], total: 0, totalPages: 0 }
    }
}

export async function getLogFilters() {
    // Get unique modules and users for filter dropdowns
    try {
        if (isPostgres && uri) {
            // Web Mode: Get distinct values from MongoDB
            const client = await getMongoClient()
            if (!client) return { modules: [], users: [] }

            const dbName = getDbName(uri)
            const db = client.db(dbName)
            const collection = db.collection('audit_logs')

            const modules = await collection.distinct('module')

            // Getting users is trickier since we only store userId string in Mongo
            // We still need to query Postgres for user details
            const userIds = await collection.distinct('userId')

            const users = await prisma.user.findMany({
                where: { id: { in: userIds.filter(id => id) } },
                select: { id: true, username: true },
                orderBy: { username: 'asc' }
            })

            return {
                modules: modules.filter(m => m),
                users
            }
        } else {
            // DESKTOP MODE (SQLite): Write to Local AuditLog
            // If we are in Postgres mode here, it means Mongo URI is missing. We can't do anything.
            if (isPostgres) return { modules: [], users: [] }

            const modelDelegate = prisma.auditLog;

            // @ts-ignore
            const [modules, users] = await prisma.$transaction([
                modelDelegate.findMany({
                    select: { module: true },
                    distinct: ['module']
                }),
                prisma.user.findMany({
                    select: { id: true, username: true },
                    orderBy: { username: 'asc' }
                })
            ])

            return {
                modules: modules.map((m: { module: string }) => m.module),
                users
            }
        }
    } catch (error) {
        return { modules: [], users: [] }
    }
}
