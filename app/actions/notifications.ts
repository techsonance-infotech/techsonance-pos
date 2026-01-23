'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getNotifications(filter: 'all' | 'unread' = 'all') {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) return []

    const whereClause: any = { userId }
    if (filter === 'unread') {
        whereClause.isRead = false
    }

    return await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 20
    })
}

export async function markNotificationAsRead(notificationId: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value
    if (!userId) return { error: "Unauthorized" }

    try {
        await prisma.notification.update({
            where: { id: notificationId, userId }, // Ensure user owns it
            data: { isRead: true }
        })
        revalidatePath('/dashboard') // Refresh UI
        return { success: true }
    } catch (error) {
        return { error: "Failed to mark as read" }
    }
}

export async function markAllAsRead() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value
    if (!userId) return { error: "Unauthorized" }

    try {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        return { error: "Failed to mark all as read" }
    }
}

export async function createNotification(userId: string, title: string, message: string) {
    try {
        await prisma.notification.create({
            data: { userId, title, message }
        })
        revalidatePath('/dashboard')
    } catch (error) {
        console.error("Failed to create notification", error)
    }
}

/**
 * Broadcast a notification to Business Owners and Managers of a company
 */
export async function broadcastNotification(companyId: string, title: string, message: string, type: 'SYSTEM' | 'ALERT' | 'PROMO' = 'SYSTEM') {
    const { isSuperAdmin } = await import('@/lib/tenant')
    if (!await isSuperAdmin()) return { error: "Unauthorized" }

    try {
        // Find target users: Business Owners and Managers of the company
        const users = await prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['BUSINESS_OWNER', 'MANAGER'] },
                isLocked: false // Only active users
            },
            select: { id: true }
        })

        if (users.length === 0) {
            return { success: true, count: 0, message: "No active Business Owners or Managers found for this company." }
        }

        // Create notifications in batch
        // SQLite doesn't support createMany nicely with relations sometimes in older Prisma, but simple createMany is fine.
        // Wait, SQLite createMany is supported in recent Prisma versions.
        await prisma.notification.createMany({
            data: users.map((u: { id: string }) => ({
                userId: u.id,
                title,
                message: `${type === 'ALERT' ? '⚠️ ' : type === 'PROMO' ? '🎉 ' : '📢 '}${message}`,
                isRead: false
            }))
        })

        revalidatePath('/dashboard')
        return { success: true, count: users.length }
    } catch (error) {
        console.error("Broadcast error:", error)
        return { error: "Failed to broadcast notification" }
    }
}
