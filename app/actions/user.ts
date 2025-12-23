'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

import { cache } from 'react'

export const getUserProfile = cache(async () => {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    console.log("getUserProfile: Cookie ID:", userId)
    console.log("getUserProfile: All Cookies:", cookieStore.getAll().map(c => c.name))

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
                    location: true,
                    tableMode: true
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
})

export async function getStoreStaff() {
    try {
        const staff = await prisma.user.findMany({
            where: {
                isApproved: true
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                contactNo: true,
                pin: true,
                isLocked: true,
                createdAt: true,
                stores: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return staff
    } catch (error) {
        console.error("Failed to fetch staff:", error)
        return []
    }
}


export async function approveUser(userId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isApproved: true }
        })
        return { success: true }
    } catch (error) {
        console.error("Failed to approve user:", error)
        return { success: false, error: "Failed to approve user" }
    }
}

export async function rejectUser(userId: string) {
    try {
        await prisma.user.delete({
            where: { id: userId }
        })
        return { success: true }
    } catch (error) {
        console.error("Failed to reject user:", error)
        return { success: false, error: "Failed to reject user" }
    }
}
