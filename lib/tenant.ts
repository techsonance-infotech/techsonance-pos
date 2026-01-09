'use server'

import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

/**
 * Tenant Context Type
 */
export interface TenantContext {
    companyId: string
    companyName: string
    companySlug: string
    storeId: string
    storeName: string
}

/**
 * Get the current user's tenant context
 * Returns null if user is not authenticated or has no company/store assigned
 * Super Admins without a selected company will also return null
 */
export async function getTenantContext(): Promise<TenantContext | null> {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return null
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                companyId: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                defaultStoreId: true,
                defaultStore: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!user?.companyId || !user?.company || !user?.defaultStoreId || !user?.defaultStore) {
            return null
        }

        return {
            companyId: user.companyId,
            companyName: user.company.name,
            companySlug: user.company.slug,
            storeId: user.defaultStoreId,
            storeName: user.defaultStore.name
        }
    } catch (error) {
        console.error("Error getting tenant context:", error)
        return null
    }
}

/**
 * Check if user has Super Admin privileges (global access)
 */
export async function isSuperAdmin(): Promise<boolean> {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return false
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        return user?.role === 'SUPER_ADMIN'
    } catch (error) {
        return false
    }
}

/**
 * Get all companies for Super Admin company switcher
 */
export async function getAllCompanies() {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return []
    }

    try {
        return await prisma.company.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                _count: {
                    select: {
                        stores: true,
                        users: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error("Error fetching companies:", error)
        return []
    }
}

/**
 * Validate that a user has access to a specific company
 * Super Admins have access to all companies
 */
export async function hasCompanyAccess(companyId: string): Promise<boolean> {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return false
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                companyId: true
            }
        })

        if (!user) return false

        // Super Admins have global access
        if (user.role === 'SUPER_ADMIN') return true

        // Other users must belong to the company
        return user.companyId === companyId
    } catch (error) {
        return false
    }
}

/**
 * Validate that a user has access to a specific store
 * The store must belong to the user's company (or user is Super Admin)
 */
export async function hasStoreAccess(storeId: string): Promise<boolean> {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return false
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                companyId: true,
                stores: {
                    where: { id: storeId },
                    select: { id: true }
                }
            }
        })

        if (!user) return false

        // Super Admins have global access
        if (user.role === 'SUPER_ADMIN') return true

        // Check if user is assigned to this store
        return user.stores.length > 0
    } catch (error) {
        return false
    }
}

/**
 * Get company ID for scoping queries - handles Super Admin viewing specific company
 * Returns null if user is Super Admin without a specific company selected
 */
export async function getQueryCompanyId(): Promise<string | null> {
    const context = await getTenantContext()
    return context?.companyId ?? null
}
