'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function getUserProfile() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            username: true,
            role: true,
        }
    })

    if (!user) return null

    const notifications = await prisma.notification.findMany({
        where: {
            userId: userId,
            isRead: false
        },
        orderBy: { createdAt: 'desc' }
    })

    return { ...user, notifications }
}


