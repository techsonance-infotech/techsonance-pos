'use server'

import { prisma as localPrisma } from "@/lib/prisma"
import { PrismaClient as PostgresClient, Role, OrderStatus, PaymentMode, TableStatus } from "@prisma/client-postgres"
import { getUserProfile } from "./user"
import path from "path"
import fs from "fs"
import os from "os"

/**
 * SQLite Bidirectional Sync - 4 Directions:
 * 1. SQLite → Local Postgres
 * 2. Local Postgres → SQLite
 * 3. SQLite → Online Postgres
 * 4. Online Postgres → SQLite
 */
export async function syncOfflineData() {
    const user = await getUserProfile()

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Unauthorized" }
    }

    const stats = {
        sqliteToLocal: { count: 0 },
        localToSqlite: { count: 0 },
        sqliteToOnline: { count: 0 },
        onlineToSqlite: { count: 0 },
        errors: [] as string[]
    }

    try {
        const homeDir = os.homedir()

        // Initialize Online Postgres Client
        const onlineUrl = process.env.ONLINE_DATABASE_URL
        let onlinePrisma: PostgresClient | null = null
        if (onlineUrl) {
            onlinePrisma = new PostgresClient({ datasources: { db: { url: onlineUrl } } })
        }

        // Try to find and open SQLite database
        let sqliteDb: any = null
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
                    sqliteDb = new Database(p)
                    // console.log("[Sync] Found SQLite at:", p)
                    break
                } catch (e) {
                    // console.log("[Sync] Could not open:", p)
                }
            }
        }

        if (!sqliteDb) {
            return { error: "SQLite database not found. Are you running in Electron or have prisma/dev.db?" }
        }

        // Helper: check if table exists
        const tableExists = (db: any, name: string) => {
            try { return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name) }
            catch { return false }
        }

        // Entity list to sync
        const entities = ['Company', 'Store', 'User', 'Category', 'Product', 'Addon', 'Table', 'Order']

        // ================================================
        // PHASE 1: SQLite → Local Postgres
        // ================================================
        // console.log("[Sync] Phase 1: SQLite → Local Postgres")
        for (const entity of entities) {
            if (!tableExists(sqliteDb, entity)) continue
            try {
                const tableName = entity === 'Table' || entity === 'Order' ? `"${entity}"` : entity
                const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all()
                for (const r of rows) {
                    try {
                        await (localPrisma as any)[entity.toLowerCase()].upsert({
                            where: { id: r.id },
                            create: sanitizeForLocalPrisma(entity, r),
                            update: sanitizeForLocalPrisma(entity, r, true)
                        })
                        stats.sqliteToLocal.count++
                    } catch (e: any) { stats.errors.push(`S→L ${entity}: ${e.message.slice(0, 50)}`) }
                }
            } catch (e: any) { stats.errors.push(`S→L ${entity} read: ${e.message.slice(0, 50)}`) }
        }

        // ================================================
        // PHASE 2: SQLite → Online Postgres
        // ================================================
        if (onlinePrisma) {
            // console.log("[Sync] Phase 2: SQLite → Online Postgres")
            for (const entity of entities) {
                if (!tableExists(sqliteDb, entity)) continue
                try {
                    const tableName = entity === 'Table' || entity === 'Order' ? `"${entity}"` : entity
                    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all()
                    for (const r of rows) {
                        try {
                            await (onlinePrisma as any)[entity.toLowerCase()].upsert({
                                where: { id: r.id },
                                create: sanitizeForOnlinePrisma(entity, r),
                                update: sanitizeForOnlinePrisma(entity, r, true)
                            })
                            stats.sqliteToOnline.count++
                        } catch (e: any) { stats.errors.push(`S→O ${entity}: ${e.message.slice(0, 50)}`) }
                    }
                } catch (e: any) { stats.errors.push(`S→O ${entity} read: ${e.message.slice(0, 50)}`) }
            }
        }

        // ================================================
        // PHASE 3: Online Postgres → SQLite
        // ================================================
        if (onlinePrisma) {
            // console.log("[Sync] Phase 3: Online Postgres → SQLite")
            for (const entity of entities) {
                try {
                    const rows = await (onlinePrisma as any)[entity.toLowerCase()].findMany()
                    for (const r of rows) {
                        try {
                            upsertToSqlite(sqliteDb, entity, r)
                            stats.onlineToSqlite.count++
                        } catch (e: any) { stats.errors.push(`O→S ${entity}: ${e.message.slice(0, 50)}`) }
                    }
                } catch (e: any) { stats.errors.push(`O→S ${entity} read: ${e.message.slice(0, 50)}`) }
            }
            await onlinePrisma.$disconnect()
        }

        // ================================================
        // PHASE 4: Local Postgres → SQLite
        // ================================================
        // console.log("[Sync] Phase 4: Local Postgres → SQLite")
        for (const entity of entities) {
            try {
                const rows = await (localPrisma as any)[entity.toLowerCase()].findMany()
                for (const r of rows) {
                    try {
                        upsertToSqlite(sqliteDb, entity, r)
                        stats.localToSqlite.count++
                    } catch (e: any) { stats.errors.push(`L→S ${entity}: ${e.message.slice(0, 50)}`) }
                }
            } catch (e: any) { stats.errors.push(`L→S ${entity} read: ${e.message.slice(0, 50)}`) }
        }

        sqliteDb.close()

        const summary = `SQLite→Local: ${stats.sqliteToLocal.count} | SQLite→Online: ${stats.sqliteToOnline.count} | Online→SQLite: ${stats.onlineToSqlite.count} | Local→SQLite: ${stats.localToSqlite.count}`

        if (stats.errors.length > 0) {
            console.error("[Sync] Errors:", stats.errors.slice(0, 10))
            return { success: true, message: summary, warnings: `${stats.errors.length} errors`, errors: stats.errors.slice(0, 15) }
        }

        return { success: true, message: `4-Way Sync Complete! ${summary}` }

    } catch (error: any) {
        console.error("[Sync] Error:", error)
        return { error: "Sync failed: " + error.message }
    }
}

// Helper: Sanitize SQLite row for Local Prisma (strings for enums)
function sanitizeForLocalPrisma(entity: string, row: any, isUpdate = false): any {
    const data: any = { ...row }

    // Convert SQLite booleans (0/1) to actual booleans
    if ('isActive' in data) data.isActive = !!data.isActive
    if ('isAvailable' in data) data.isAvailable = !!data.isAvailable
    if ('isLocked' in data) data.isLocked = !!data.isLocked
    if ('isApproved' in data) data.isApproved = !!data.isApproved
    if ('isVerified' in data) data.isVerified = !!data.isVerified
    if ('tableMode' in data && data.tableMode !== null) data.tableMode = !!data.tableMode

    // Ensure disabledModules is a string for SQLite schema
    if ('disabledModules' in data && Array.isArray(data.disabledModules)) {
        data.disabledModules = data.disabledModules.join(',')
    }

    // Remove relation fields and timestamps for updates
    if (isUpdate) {
        delete data.id
        delete data.createdAt
    }
    delete data.stores
    delete data.company
    delete data.users
    delete data.categories
    delete data.products
    delete data.addons
    delete data.orders
    delete data.tables

    return data
}

// Helper: Sanitize SQLite row for Online Prisma (enums)
function sanitizeForOnlinePrisma(entity: string, row: any, isUpdate = false): any {
    const data: any = { ...row }

    // Convert SQLite booleans
    if ('isActive' in data) data.isActive = !!data.isActive
    if ('isAvailable' in data) data.isAvailable = !!data.isAvailable
    if ('isLocked' in data) data.isLocked = !!data.isLocked
    if ('isApproved' in data) data.isApproved = !!data.isApproved
    if ('isVerified' in data) data.isVerified = !!data.isVerified
    if ('tableMode' in data && data.tableMode !== null) data.tableMode = !!data.tableMode

    // Convert string enums to proper enums for Postgres
    if (entity === 'User' && data.role) data.role = data.role as Role
    if (entity === 'Table' && data.status) data.status = data.status as TableStatus
    if (entity === 'Order') {
        if (data.status) data.status = data.status as OrderStatus
        if (data.paymentMode) data.paymentMode = data.paymentMode as PaymentMode
    }

    // Convert disabledModules string to array for Postgres
    if ('disabledModules' in data) {
        data.disabledModules = typeof data.disabledModules === 'string'
            ? data.disabledModules.split(',').filter(Boolean)
            : (data.disabledModules || [])
    }

    if (isUpdate) {
        delete data.id
        delete data.createdAt
    }
    delete data.stores
    delete data.company
    delete data.users
    delete data.categories
    delete data.products
    delete data.addons
    delete data.orders
    delete data.tables

    return data
}

// Helper: Upsert row to SQLite
function upsertToSqlite(db: any, entity: string, row: any) {
    const tableName = entity === 'Table' || entity === 'Order' ? `"${entity}"` : entity

    // Get columns from the row
    const cols: string[] = []
    const vals: any[] = []

    for (const [key, val] of Object.entries(row)) {
        // Skip relation fields
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) continue
        if (Array.isArray(val) && key !== 'disabledModules' && key !== 'items') continue

        cols.push(key)

        // Convert values for SQLite
        if (val instanceof Date) {
            vals.push(val.toISOString())
        } else if (typeof val === 'boolean') {
            vals.push(val ? 1 : 0)
        } else if (Array.isArray(val)) {
            vals.push(val.join(','))
        } else if (typeof val === 'object' && val !== null) {
            vals.push(JSON.stringify(val))
        } else {
            vals.push(val)
        }
    }

    const placeholders = cols.map(() => '?').join(', ')
    const updates = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(', ')

    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`

    try {
        db.prepare(sql).run(...vals)
    } catch (e: any) {
        throw new Error(`SQLite upsert failed: ${e.message}`)
    }
}
