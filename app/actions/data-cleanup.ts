'use server'

import { prisma as localPrisma } from "@/lib/prisma"
import { PrismaClient as PostgresClient } from "@prisma/client-postgres"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import path from "path"
import fs from "fs"
import os from "os"

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
 * Get SQLite database connection
 */
function getSqliteDb(): any | null {
    const homeDir = os.homedir()
    const candidatePaths = [
        path.join(homeDir, 'AppData', 'Roaming', 'techsonance-pos', 'pos.db'),
        path.join(homeDir, 'AppData', 'Roaming', 'Electron', 'pos.db'),
        path.join(process.cwd(), 'pos.db'),
        path.join(process.cwd(), 'prisma', 'dev.db')
    ]

    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            try {
                const Database = require('better-sqlite3')
                return new Database(p)
            } catch { continue }
        }
    }
    return null
}

/**
 * Get Online Postgres client
 */
function getOnlineClient(): PostgresClient | null {
    const onlineUrl = process.env.ONLINE_DATABASE_URL
    if (!onlineUrl) return null
    return new PostgresClient({ datasources: { db: { url: onlineUrl } } })
}

/**
 * Clear all orders from ALL 3 databases (Local, Online, SQLite)
 */
export async function clearOrders(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let totalDeleted = 0
        const errors: string[] = []

        // Get store IDs for company-scoped deletion
        let storeIds: string[] = []
        if (user.companyId) {
            const stores = await localPrisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            storeIds = stores.map((s: { id: string }) => s.id)
        }

        const isSuperAdmin = user.role === 'SUPER_ADMIN' && !user.companyId

        // 1. Clear from Local Postgres
        try {
            const result = isSuperAdmin
                ? await localPrisma.order.deleteMany({})
                : await localPrisma.order.deleteMany({ where: { storeId: { in: storeIds } } })
            totalDeleted += result.count
            console.log(`[Cleanup] Deleted ${result.count} orders from Local Postgres`)
        } catch (e: any) { errors.push(`Local: ${e.message}`) }

        // 2. Clear from Online Postgres
        const onlinePrisma = getOnlineClient()
        if (onlinePrisma) {
            try {
                const result = isSuperAdmin
                    ? await onlinePrisma.order.deleteMany({})
                    : await onlinePrisma.order.deleteMany({ where: { storeId: { in: storeIds } } })
                totalDeleted += result.count
                console.log(`[Cleanup] Deleted ${result.count} orders from Online Postgres`)
            } catch (e: any) { errors.push(`Online: ${e.message}`) }
            finally { await onlinePrisma.$disconnect() }
        }

        // 3. Clear from SQLite
        const sqliteDb = getSqliteDb()
        if (sqliteDb) {
            try {
                if (isSuperAdmin) {
                    const info = sqliteDb.prepare('DELETE FROM "Order"').run()
                    totalDeleted += info.changes
                } else if (storeIds.length > 0) {
                    const placeholders = storeIds.map(() => '?').join(',')
                    const info = sqliteDb.prepare(`DELETE FROM "Order" WHERE storeId IN (${placeholders})`).run(...storeIds)
                    totalDeleted += info.changes
                }
                console.log(`[Cleanup] Deleted orders from SQLite`)
            } catch (e: any) { errors.push(`SQLite: ${e.message}`) }
            finally { sqliteDb.close() }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/recent-orders')
        revalidatePath('/dashboard/reports')

        if (errors.length > 0) {
            return { success: true, message: `Deleted ${totalDeleted} orders with ${errors.length} warnings`, deletedCount: totalDeleted }
        }

        return { success: true, message: `Deleted ${totalDeleted} order(s) from all databases`, deletedCount: totalDeleted }
    } catch (error) {
        console.error("Error clearing orders:", error)
        return { success: false, message: "Failed to clear orders. Please try again." }
    }
}

/**
 * Clear all products and categories from ALL 3 databases
 */
export async function clearProducts(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let totalDeleted = 0
        const errors: string[] = []

        let storeIds: string[] = []
        let categoryIds: string[] = []
        if (user.companyId) {
            const stores = await localPrisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            storeIds = stores.map((s: { id: string }) => s.id)

            const categories = await localPrisma.category.findMany({
                where: { storeId: { in: storeIds } },
                select: { id: true }
            })
            categoryIds = categories.map((c: { id: string }) => c.id)
        }

        const isSuperAdmin = user.role === 'SUPER_ADMIN' && !user.companyId

        // 1. Clear from Local Postgres
        try {
            if (isSuperAdmin) {
                await localPrisma.addon.deleteMany({})
                const prodResult = await localPrisma.product.deleteMany({})
                const catResult = await localPrisma.category.deleteMany({})
                totalDeleted += prodResult.count + catResult.count
            } else if (categoryIds.length > 0) {
                await localPrisma.addon.deleteMany({ where: { product: { categoryId: { in: categoryIds } } } })
                const prodResult = await localPrisma.product.deleteMany({ where: { categoryId: { in: categoryIds } } })
                const catResult = await localPrisma.category.deleteMany({ where: { storeId: { in: storeIds } } })
                totalDeleted += prodResult.count + catResult.count
            }
            console.log(`[Cleanup] Deleted products/categories from Local Postgres`)
        } catch (e: any) { errors.push(`Local: ${e.message}`) }

        // 2. Clear from Online Postgres
        const onlinePrisma = getOnlineClient()
        if (onlinePrisma) {
            try {
                if (isSuperAdmin) {
                    await onlinePrisma.addon.deleteMany({})
                    const prodResult = await onlinePrisma.product.deleteMany({})
                    const catResult = await onlinePrisma.category.deleteMany({})
                    totalDeleted += prodResult.count + catResult.count
                } else if (categoryIds.length > 0) {
                    await onlinePrisma.addon.deleteMany({ where: { product: { categoryId: { in: categoryIds } } } })
                    const prodResult = await onlinePrisma.product.deleteMany({ where: { categoryId: { in: categoryIds } } })
                    const catResult = await onlinePrisma.category.deleteMany({ where: { storeId: { in: storeIds } } })
                    totalDeleted += prodResult.count + catResult.count
                }
                console.log(`[Cleanup] Deleted products/categories from Online Postgres`)
            } catch (e: any) { errors.push(`Online: ${e.message}`) }
            finally { await onlinePrisma.$disconnect() }
        }

        // 3. Clear from SQLite
        const sqliteDb = getSqliteDb()
        if (sqliteDb) {
            try {
                if (isSuperAdmin) {
                    sqliteDb.prepare('DELETE FROM Addon').run()
                    sqliteDb.prepare('DELETE FROM Product').run()
                    sqliteDb.prepare('DELETE FROM Category').run()
                } else if (categoryIds.length > 0) {
                    const catPlaceholders = categoryIds.map(() => '?').join(',')
                    const storePlaceholders = storeIds.map(() => '?').join(',')
                    sqliteDb.prepare(`DELETE FROM Addon WHERE productId IN (SELECT id FROM Product WHERE categoryId IN (${catPlaceholders}))`).run(...categoryIds)
                    sqliteDb.prepare(`DELETE FROM Product WHERE categoryId IN (${catPlaceholders})`).run(...categoryIds)
                    sqliteDb.prepare(`DELETE FROM Category WHERE storeId IN (${storePlaceholders})`).run(...storeIds)
                }
                console.log(`[Cleanup] Deleted products/categories from SQLite`)
            } catch (e: any) { errors.push(`SQLite: ${e.message}`) }
            finally { sqliteDb.close() }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/menu')
        revalidatePath('/dashboard/new-order')

        return { success: true, message: `Deleted ${totalDeleted} products/categories from all databases`, deletedCount: totalDeleted }
    } catch (error) {
        console.error("Error clearing products:", error)
        return { success: false, message: "Failed to clear products. Please try again." }
    }
}

/**
 * Clear all tables from ALL 3 databases
 */
export async function clearTables(): Promise<CleanupResult> {
    try {
        const { allowed, user, error } = await verifyCleanupPermission()
        if (!allowed) {
            return { success: false, message: error || "Permission denied" }
        }

        let totalDeleted = 0
        const errors: string[] = []

        let storeIds: string[] = []
        if (user.companyId) {
            const stores = await localPrisma.store.findMany({
                where: { companyId: user.companyId },
                select: { id: true }
            })
            storeIds = stores.map((s: { id: string }) => s.id)
        }

        const isSuperAdmin = user.role === 'SUPER_ADMIN' && !user.companyId

        // 1. Clear from Local Postgres
        try {
            const result = isSuperAdmin
                ? await localPrisma.table.deleteMany({})
                : await localPrisma.table.deleteMany({ where: { storeId: { in: storeIds } } })
            totalDeleted += result.count
            console.log(`[Cleanup] Deleted ${result.count} tables from Local Postgres`)
        } catch (e: any) { errors.push(`Local: ${e.message}`) }

        // 2. Clear from Online Postgres
        const onlinePrisma = getOnlineClient()
        if (onlinePrisma) {
            try {
                const result = isSuperAdmin
                    ? await onlinePrisma.table.deleteMany({})
                    : await onlinePrisma.table.deleteMany({ where: { storeId: { in: storeIds } } })
                totalDeleted += result.count
                console.log(`[Cleanup] Deleted ${result.count} tables from Online Postgres`)
            } catch (e: any) { errors.push(`Online: ${e.message}`) }
            finally { await onlinePrisma.$disconnect() }
        }

        // 3. Clear from SQLite
        const sqliteDb = getSqliteDb()
        if (sqliteDb) {
            try {
                if (isSuperAdmin) {
                    const info = sqliteDb.prepare('DELETE FROM "Table"').run()
                    totalDeleted += info.changes
                } else if (storeIds.length > 0) {
                    const placeholders = storeIds.map(() => '?').join(',')
                    const info = sqliteDb.prepare(`DELETE FROM "Table" WHERE storeId IN (${placeholders})`).run(...storeIds)
                    totalDeleted += info.changes
                }
                console.log(`[Cleanup] Deleted tables from SQLite`)
            } catch (e: any) { errors.push(`SQLite: ${e.message}`) }
            finally { sqliteDb.close() }
        }

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/tables')

        return { success: true, message: `Deleted ${totalDeleted} table(s) from all databases`, deletedCount: totalDeleted }
    } catch (error) {
        console.error("Error clearing tables:", error)
        return { success: false, message: "Failed to clear tables. Please try again." }
    }
}

/**
 * Nuclear option: Clear all data (orders, products, categories, tables) from ALL 3 databases
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
            message: `Cleared all data from all 3 databases. Total: ${totalDeleted} items`,
            deletedCount: totalDeleted
        }
    } catch (error) {
        console.error("Error clearing all data:", error)
        return { success: false, message: "Failed to clear all data. Please try again." }
    }
}
