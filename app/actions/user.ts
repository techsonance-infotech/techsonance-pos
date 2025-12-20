'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function getUserProfile() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    console.log("getUserProfile: Cookie ID:", userId)

    if (!userId) {
        console.log("getUserProfile: No User ID in cookie")
        return null
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            role: true,
            defaultStoreId: true,
            defaultStore: true,
            stores: {
                select: {
                    id: true,
                    name: true,
                    location: true
                }
            }
        }
    })

    if (!user) {
        console.log("getUserProfile: User not found in DB")
        return null
    }

    const notifications = await prisma.notification.findMany({
        where: {
            userId: userId,
            isRead: false
        },
        orderBy: { createdAt: 'desc' }
    })

    return { ...user, notifications }
}

export async function getStoreStaff() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    try {
        const staff = await prisma.user.findMany({
            where: {
                stores: {
                    some: { id: user.defaultStoreId }
                }
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                contactNo: true,
                pin: true // Also fetching PIN to show if set (masked)
            }
        })
        return staff
    } catch (error) {
        console.error("Failed to fetch staff:", error)
        return []
    }
}


