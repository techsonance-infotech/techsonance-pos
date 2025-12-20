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
