'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"

type CleanupResult = {
    success: boolean
    message: string
    deletedCount?: number
}

/**
 * Check if current user has cleanup permissions (SUPER_ADMIN or BUSINESS_OWNER only)
 */
async function verifyCleanupPermission(): Promise<{ allowed: boolean; user: any; error?: string }> {
    const user = await getUserProfile()

    if (!user) {
        return { allowed: false, user: null, error: "Not authenticated" }
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
        return { allowed: false, user, error: "Insufficient permissions. Only Super Admin and Business Owner can perform data cleanup." }
    }

    return { allowed: true, user }
}

/**
 * Clear all orders for the user's company
 * SUPER_ADMIN: Clears orders across all companies (if no company assigned) or selected company
 * BUSINESS_OWNER: Clears orders only for their company
 */
export async function clearOrders(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let deletedCount: number

        if (user.role === 'SUPER_ADMIN' && !user.companyId) {
            // Super Admin without company - clear all orders
            const result = await prisma.order.deleteMany({})
            deletedCount = result.count
        } else if (user.companyId) {
            // Delete orders for stores belonging to user's company
            const stores = await prisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            const storeIds = stores.map((s: { id: string }) => s.id)

            const result = await prisma.order.deleteMany({
                where: { storeId: { in: storeIds } }
            })
            deletedCount = result.count
        } else {
            return { success: false, message: "No company context found" }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/recent-orders')
        revalidatePath('/dashboard/reports')

        return {
            success: true,
            message: `Successfully deleted ${deletedCount} order(s)`,
            deletedCount
        }
    } catch (error) {
        console.error("Error clearing orders:", error)
        return { success: false, message: "Failed to clear orders. Please try again." }
    }
}

/**
 * Clear all products and categories for the user's company
 */
export async function clearProducts(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let deletedProducts: number
        let deletedCategories: number

        if (user.role === 'SUPER_ADMIN' && !user.companyId) {
            // Super Admin without company - clear all
            const prodResult = await prisma.product.deleteMany({})
            const catResult = await prisma.category.deleteMany({})
            deletedProducts = prodResult.count
            deletedCategories = catResult.count
        } else if (user.companyId) {
            // Delete for stores belonging to user's company
            const stores = await prisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            const storeIds = stores.map((s: { id: string }) => s.id)

            // Delete products first (due to foreign key)
            const categories = await prisma.category.findMany({
                where: { storeId: { in: storeIds } },
                select: { id: true }
            })
            const categoryIds = categories.map((c: { id: string }) => c.id)

            const prodResult = await prisma.product.deleteMany({
                where: { categoryId: { in: categoryIds } }
            })
            const catResult = await prisma.category.deleteMany({
                where: { storeId: { in: storeIds } }
            })

            deletedProducts = prodResult.count
            deletedCategories = catResult.count
        } else {
            return { success: false, message: "No company context found" }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/menu')
        revalidatePath('/dashboard/new-order')

        return {
            success: true,
            message: `Successfully deleted ${deletedProducts} product(s) and ${deletedCategories} category(ies)`,
            deletedCount: deletedProducts + deletedCategories
        }
    } catch (error) {
        console.error("Error clearing products:", error)
        return { success: false, message: "Failed to clear products. Please try again." }
    }
}

/**
 * Clear all tables for the user's company
 */
export async function clearTables(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let deletedCount: number

        if (user.role === 'SUPER_ADMIN' && !user.companyId) {
            const result = await prisma.table.deleteMany({})
            deletedCount = result.count
        } else if (user.companyId) {
            const stores = await prisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            const storeIds = stores.map((s: { id: string }) => s.id)

            const result = await prisma.table.deleteMany({
                where: { storeId: { in: storeIds } }
            })
            deletedCount = result.count
        } else {
            return { success: false, message: "No company context found" }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/tables')

        return {
            success: true,
            message: `Successfully deleted ${deletedCount} table(s)`,
            deletedCount
        }
    } catch (error) {
        console.error("Error clearing tables:", error)
        return { success: false, message: "Failed to clear tables. Please try again." }
    }
}

/**
 * Nuclear option: Clear all data (orders, products, categories, tables)
 */
export async function clearAllData(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        const ordersResult = await clearOrders()
        const productsResult = await clearProducts()
        const tablesResult = await clearTables()

        const totalDeleted =
            (ordersResult.deletedCount || 0) +
            (productsResult.deletedCount || 0) +
            (tablesResult.deletedCount || 0)

        if (!ordersResult.success || !productsResult.success || !tablesResult.success) {
            const failedOps = [
                !ordersResult.success && 'orders',
                !productsResult.success && 'products',
                !tablesResult.success && 'tables'
            ].filter(Boolean).join(', ')

            return {
                success: false,
                message: `Partial failure. Failed to clear: ${failedOps}`
            }
        }

        revalidatePath('/dashboard')

        return {
            success: true,
            message: `Successfully cleared all data. Total items deleted: ${totalDeleted}`,
            deletedCount: totalDeleted
        }
    } catch (error) {
        console.error("Error clearing all data:", error)
        return { success: false, message: "Failed to clear all data. Please try again." }
    }
}
