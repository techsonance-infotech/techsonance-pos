'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

import { cache } from 'react'
import { unstable_cache, revalidateTag } from "next/cache"

// Internal DB fetcher
async function fetchUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            role: true,
            defaultStoreId: true,
            defaultStore: true,
            // Security fields
            disabledModules: true,
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
    return user
}

// Direct DB call (No Cache for Critical User State)
const getCachedUser = async (userId: string) => {
    return fetchUser(userId)
}

export const getUserProfile = cache(async () => {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return null
    }

    // Use cached fetcher, passing userId as argument which forms part of the cache key automatically in newer Next.js? 
    // Actually unstable_cache 2nd arg is keyParts. 
    // To properly cache per user, we need to wrap the fetcher uniquely or rely on arguments.
    // unstable_cache(fn, keyParts, options)(...args)
    // So we need to define the cached function outside.

    // Correct usage:
    const user = await getCachedUser(userId)

    if (!user) {
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

export async function getUserStoreDetails() {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('session_user_id')?.value
        if (!userId) return null

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                defaultStore: {
                    select: {
                        name: true,
                        location: true
                    }
                }
            }
        })
        return user?.defaultStore || null
    } catch (error) {
        return null
    }
}
