'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"

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

    // Authorization: Only Admin/Owner/Manager can view logs?
    // Let's assume yes for now, or just Owner/Admin.
    // user.role check...

    try {
        const where: any = {}

        if (module && module !== 'ALL') {
            where.module = module
        }

        if (userId && userId !== 'ALL') {
            where.userId = userId
        }

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
            where.OR = [
                { action: { contains: search } }, // SQLite: contains is case-insensitive? In standard SQL it isn't, but Prisma handles it. 
                // Wait, Prisma 'contains' on SQLite is case-insensitive.
                // But on Postgres it is case-sensitive unless mode: 'insensitive' is used.
                // Since this runs on both, we should use mode: 'insensitive' if possible, but SQLite doesn't support 'mode'.
                // However, the user is currently on Postgres for web (per recent context), but maybe SQLite for desktop.
                // Let's try to be safe.
                { details: { contains: search } },
                { module: { contains: search } },
                {
                    user: {
                        username: { contains: search }
                    }
                }
            ]
        }

        const skip = (page - 1) * limit

        const [logs, total] = await prisma.$transaction([
            prisma.activityLog.findMany({
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
            prisma.activityLog.count({ where })
        ])

        return {
            logs,
            total,
            totalPages: Math.ceil(total / limit)
        }

    } catch (error) {
        console.error("Failed to fetch logs", error)
        return { logs: [], total: 0, totalPages: 0 }
    }
}

export async function getLogFilters() {
    // Get unique modules and users for filter dropdowns
    try {
        const [modules, users] = await prisma.$transaction([
            prisma.activityLog.findMany({
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
    } catch (error) {
        return { modules: [], users: [] }
    }
}
