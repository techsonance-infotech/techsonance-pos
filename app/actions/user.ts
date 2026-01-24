'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

import { cache } from 'react'
import { unstable_cache, revalidateTag } from "next/cache"

// Internal DB fetcher
async function fetchUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                contactNo: true,
                role: true,
                // Multi-tenant context
                companyId: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true
                    }
                },
                defaultStoreId: true,
                defaultStore: true,
                // Security fields
                disabledModules: true,
                stores: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        tableMode: true,
                        companyId: true
                    }
                }
            }
        })

        // For Business Owners and Managers, ensure we return ALL stores in their company
        if (user && (user.role === 'BUSINESS_OWNER' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') && user.companyId) {
            try {
                const allStores = await prisma.store.findMany({
                    where: { companyId: user.companyId },
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        tableMode: true,
                        companyId: true
                    }
                })
                return { ...user, stores: allStores }
            } catch (e) {
                console.warn("[fetchUser] Failed to fetch company stores:", e)
                return user // Return user without extra stores if fetch fails
            }
        }

        return user

    } catch (error) {
        console.warn(`[fetchUser] Failed to fetch user ${userId} (Offline?):`, error)
        return null
    }
}

// Direct DB call (No Cache for Critical User State)
const getCachedUser = async (userId: string) => {
    return fetchUser(userId)
}

export const getUserProfile = cache(async () => {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    // console.log(`[getUserProfile] userId from cookie: ${userId}`)

    // console.log(`[getUserProfile] userId from cookie: ${userId}`)

    if (!userId) {
        console.log("[getUserProfile] No userId in cookie")
        return null
    }

    const user = await getCachedUser(userId)
    // console.log(`[getUserProfile] user found in DB: ${!!user}, role: ${user?.role}`)

    if (!user) {
        return null
    }

    let notifications: any[] = []
    try {
        notifications = await prisma.notification.findMany({
            where: {
                userId: userId,
                isRead: false
            },
            orderBy: { createdAt: 'desc' }
        })
    } catch (e) {
        console.warn("[getUserProfile] Failed to fetch notifications (Offline?)")
    }

    return { ...user, notifications }
})

export async function getStoreStaff() {
    try {
        const currentUser = await getUserProfile()
        if (!currentUser?.companyId) {
            // If no company, maybe return empty or just throw
            // But if SUPER_ADMIN? They might see all. 
            // The prompt says "only show that user will be visible", implies strict isolation.
            // If Platform Admin, maybe they see all? 
            // Let's assume strict company isolation even for safety.
            // Actually, if currentUser has no company, they can't see company staff.
            return []
        }

        const staff = await prisma.user.findMany({
            where: {
                companyId: currentUser.companyId, // Filter by Company
                isApproved: true,
                role: {
                    not: 'SUPER_ADMIN' // Exclude Super Admin role
                }
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
                disabledModules: true,
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
        return staff
    } catch (error) {
        console.error("Failed to fetch staff:", error)
        return []
    }
}

export async function getCompanyStores() {
    try {
        const currentUser = await getUserProfile()
        if (!currentUser?.companyId) {
            console.log(`[getCompanyStores] User ${currentUser?.id} has no companyId. Role: ${currentUser?.role}`)
            return []
        }

        const stores = await prisma.store.findMany({
            where: {
                companyId: currentUser.companyId
            },
            select: {
                id: true,
                name: true,
                location: true
            },
            orderBy: {
                name: 'asc'
            }
        })
        console.log(`[getCompanyStores] Fetched ${stores.length} stores for company ${currentUser.companyId}`)
        return stores
    } catch (error) {
        console.error("Failed to fetch stores:", error)
        return []
    }
}


export async function approveUser(userId: string) {
    try {
        const currentUser = await getUserProfile()
        await prisma.user.update({
            where: { id: userId },
            data: { isApproved: true }
        })

        if (currentUser) {
            await logAudit({
                action: 'APPROVE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: currentUser.id,
                userRoleId: currentUser.role,
                tenantId: currentUser.companyId || undefined,
                storeId: currentUser.defaultStoreId || undefined,
                reason: 'User approved by admin',
                severity: 'MEDIUM'
            })
        }
        return { success: true }
    } catch (error) {
        console.error("Failed to approve user:", error)
        return { success: false, error: "Failed to approve user" }
    }
}

export async function rejectUser(userId: string) {
    try {
        const currentUser = await getUserProfile()
        await prisma.user.delete({
            where: { id: userId }
        })

        if (currentUser) {
            await logAudit({
                action: 'DELETE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: currentUser.id,
                userRoleId: currentUser.role,
                tenantId: currentUser.companyId || undefined,
                storeId: currentUser.defaultStoreId || undefined,
                reason: 'User rejected/deleted by admin',
                severity: 'HIGH'
            })
        }
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
