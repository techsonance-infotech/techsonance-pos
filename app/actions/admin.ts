'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function broadcastNotification(prevState: any, formData: FormData) {
    const title = formData.get("title") as string
    const message = formData.get("message") as string
    const targetRole = formData.get("targetRole") as string // 'ALL', 'BUSINESS_OWNER', 'USER'

    if (!title || !message) {
        return { error: "Title and message are required" }
    }

    try {
        let usersToNotify = []

        if (targetRole && targetRole !== 'ALL') {
            // Find users with specific role
            usersToNotify = await prisma.user.findMany({
                where: { role: targetRole as any },
                select: { id: true }
            })
        } else {
            // Find all users except the sender (optional, but good practice)
            usersToNotify = await prisma.user.findMany({
                select: { id: true }
            })
        }

        if (usersToNotify.length === 0) {
            return { success: "No users found to notify" }
        }

        // Bulk create notifications
        await prisma.notification.createMany({
            data: usersToNotify.map((user: { id: string }) => ({
                userId: user.id,
                title,
                message,
                isRead: false
            }))
        })

        return { success: `Notification sent to ${usersToNotify.length} users` }

    } catch (error) {
        console.error("Broadcast error:", error)
        return { error: "Failed to broadcast notification" }
    }
}
