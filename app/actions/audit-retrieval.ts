'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"

export async function getAuditLogs(filters: {
    module?: string,
    action?: string,
    startDate?: string // ISO string
    endDate?: string   // ISO string
} = {}) {
    const user = await getUserProfile()
    if (!user || (user.role !== 'BUSINESS_OWNER' && user.role !== 'SUPER_ADMIN')) return [] // Admin Access

    const where: any = {
        tenantId: user.companyId
    }

    if (filters.module) where.module = filters.module
    if (filters.action) where.action = filters.action

    // Date Range
    if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    try {
        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { username: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
        return logs
    } catch (error) {
        console.error("Failed to fetch audit logs:", error)
        return []
    }
}
