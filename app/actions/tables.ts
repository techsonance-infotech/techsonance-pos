'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { logActivity } from "@/lib/logger"

// ========== FLOOR-BASED TABLE MANAGEMENT ==========

/**
 * Get all floors with table counts and availability stats
 * Used for floor tabs navigation
 */
export async function getFloorsWithTables() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { floors: [], unassignedCount: 0 }

    // Get floors and all tables in parallel
    const [floors, tables] = await Promise.all([
        prisma.floor.findMany({
            where: { storeId: user.defaultStoreId },
            orderBy: { sortOrder: 'asc' }
        }),
        prisma.table.findMany({
            where: { storeId: user.defaultStoreId },
            select: { id: true, floorId: true, status: true }
        })
    ])

    // Calculate stats for each floor
    type FloorRow = { id: string; name: string; sortOrder: number }
    type TableRow = { id: string; floorId: string | null; status: string }

    const floorStats = floors.map((floor: FloorRow) => {
        const floorTables = tables.filter((t: TableRow) => t.floorId === floor.id)
        return {
            id: floor.id,
            name: floor.name,
            sortOrder: floor.sortOrder,
            totalTables: floorTables.length,
            occupiedCount: floorTables.filter((t: TableRow) => t.status === 'OCCUPIED').length,
            availableCount: floorTables.filter((t: TableRow) => t.status === 'AVAILABLE').length,
            reservedCount: floorTables.filter((t: TableRow) => t.status === 'RESERVED').length
        }
    })

    // Count unassigned tables (no floorId)
    const unassignedTables = tables.filter((t: TableRow) => !t.floorId)
    const unassignedStats = {
        totalTables: unassignedTables.length,
        occupiedCount: unassignedTables.filter((t: TableRow) => t.status === 'OCCUPIED').length,
        availableCount: unassignedTables.filter((t: TableRow) => t.status === 'AVAILABLE').length,
        reservedCount: unassignedTables.filter((t: TableRow) => t.status === 'RESERVED').length
    }

    return { floors: floorStats, unassigned: unassignedStats }
}

/**
 * Create a new floor
 */
export async function createFloor(name: string, sortOrder?: number) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // Validate: Check for duplicate floor name
    const existingFloor = await prisma.floor.findFirst({
        where: {
            storeId: user.defaultStoreId,
            name: { equals: name, mode: 'insensitive' }
        }
    })
    if (existingFloor) {
        throw new Error(`Floor "${name}" already exists`)
    }

    // Get current max sortOrder if not provided
    if (sortOrder === undefined) {
        const existing = await prisma.floor.findMany({
            where: { storeId: user.defaultStoreId },
            orderBy: { sortOrder: 'desc' },
            take: 1
        })
        sortOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0
    }

    const floor = await prisma.floor.create({
        data: {
            name,
            sortOrder,
            storeId: user.defaultStoreId
        }
    })

    revalidatePath('/dashboard/tables')
    return floor
}

/**
 * Get all floors for dropdown/selection
 */
export async function getFloors() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    return await prisma.floor.findMany({
        where: { storeId: user.defaultStoreId },
        orderBy: { sortOrder: 'asc' }
    })
}

/**
 * Assign a table to a floor
 */
export async function assignTableToFloor(tableId: string, floorId: string | null) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    const table = await prisma.table.update({
        where: {
            id: tableId,
            storeId: user.defaultStoreId
        },
        data: { floorId }
    })

    revalidatePath('/dashboard/tables')
    return table
}

/**
 * Update a floor (rename)
 */
export async function updateFloor(floorId: string, name: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // Validate: Check for duplicate floor name (excluding this floor)
    const existingFloor = await prisma.floor.findFirst({
        where: {
            storeId: user.defaultStoreId,
            name: { equals: name, mode: 'insensitive' },
            id: { not: floorId }
        }
    })
    if (existingFloor) {
        throw new Error(`Floor "${name}" already exists`)
    }

    const floor = await prisma.floor.update({
        where: {
            id: floorId,
            storeId: user.defaultStoreId
        },
        data: { name }
    })

    revalidatePath('/dashboard/tables')
    return floor
}

/**
 * Delete a floor and all its tables (cascade delete)
 */
export async function deleteFloor(floorId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // First, delete all tables on this floor
    await prisma.table.deleteMany({
        where: {
            floorId: floorId,
            storeId: user.defaultStoreId
        }
    })

    // Then delete the floor itself
    await prisma.floor.delete({
        where: {
            id: floorId,
            storeId: user.defaultStoreId
        }
    })

    revalidatePath('/dashboard/tables')
    return { success: true }
}

/**
 * Get tables for a specific floor with held order info
 * floorId = null means get unassigned tables
 */
export async function getTablesForFloor(floorId: string | null) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    // Build where clause
    const whereClause: any = { storeId: user.defaultStoreId }
    if (floorId === null) {
        whereClause.floorId = null
    } else if (floorId !== 'all') {
        whereClause.floorId = floorId
    }

    // Parallel fetch tables and held orders
    const [tables, heldOrders] = await Promise.all([
        prisma.table.findMany({
            where: whereClause,
            include: {
                floor: { select: { name: true } },
                waiter: { select: { id: true, username: true } },
                mergedWith: { select: { id: true, name: true } },
                subTables: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        }),
        prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                status: 'HELD',
                tableId: { not: null }
            },
            select: {
                id: true,
                tableId: true,
                createdAt: true
            }
        })
    ])

    // Create held order map
    const heldOrderMap = new Map<string, { createdAt: Date; orderId: string }>()
    for (const order of heldOrders) {
        if (order.tableId) {
            const existing = heldOrderMap.get(order.tableId)
            if (!existing || order.createdAt < existing.createdAt) {
                heldOrderMap.set(order.tableId, { createdAt: order.createdAt, orderId: order.id })
            }
        }
    }

    // Merge data
    return tables.map((table: any) => {
        const heldInfo = heldOrderMap.get(table.id)
        return {
            id: table.id,
            name: table.name,
            capacity: table.capacity,
            status: table.status,
            floorId: table.floorId,
            floorName: table.floor?.name || null,
            qrToken: table.qrToken,
            waiter: table.waiter ? { id: table.waiter.id, name: table.waiter.username } : null,
            mergedWith: table.mergedWith || null,
            subTables: table.subTables || [],
            heldOrderCreatedAt: heldInfo?.createdAt.toISOString() || null,
            heldOrderId: heldInfo?.orderId || null
        }
    })
}

// ========== ADVANCED ACTIONS ==========

export async function getWaiters() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    // Return users who have access to this store
    // In a real app, filter by Role with 'waiter' permissions
    return await prisma.user.findMany({
        where: {
            stores: { some: { id: user.defaultStoreId } }
        },
        select: { id: true, username: true, role: true }
    })
}

export async function assignWaiter(tableId: string, waiterId: string | null) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    await prisma.table.update({
        where: { id: tableId, storeId: user.defaultStoreId },
        data: { waiterId }
    })
    revalidatePath('/dashboard/tables')
    return { success: true }
}

export async function mergeTables(primaryTableId: string, targetTableIds: string[]) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // Link secondary tables to primary
    await prisma.table.updateMany({
        where: {
            id: { in: targetTableIds },
            storeId: user.defaultStoreId
        },
        data: { mergedWithId: primaryTableId }
    })
    revalidatePath('/dashboard/tables')
    return { success: true }
}

export async function unmergeTable(tableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // Unlink: mergedWithId = null
    // If this is a primary table, we need to unlink all subTables
    // But usually we call unmerge on a specific secondary table or 'break' the merge on primary.
    // Let's assume unmerge means "remove from merge" for the target table.

    // Check if table is primary or secondary
    const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: { subTables: true }
    })

    if (!table) throw new Error("Table not found")

    if (table.mergedWithId) {
        // It's a secondary table, just detach it
        await prisma.table.update({
            where: { id: tableId },
            data: { mergedWithId: null }
        })
    } else if (table.subTables.length > 0) {
        // It's a primary table, detach ALL sub tables
        await prisma.table.updateMany({
            where: { mergedWithId: tableId },
            data: { mergedWithId: null }
        })
    }

    revalidatePath('/dashboard/tables')
    return { success: true }
}

export async function transferTable(fromTableId: string, toTableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    // 1. Move active orders (HELD) from FromTable to ToTable
    await prisma.order.updateMany({
        where: {
            tableId: fromTableId,
            status: 'HELD',
            storeId: user.defaultStoreId
        },
        data: { tableId: toTableId }
    })

    // 2. Update statuses
    // Set FromTable to CLEANING or AVAILABLE? PRD says "Cleaning" usually follows.
    // Let's set FromTable to CLEANING
    await prisma.table.update({
        where: { id: fromTableId },
        data: { status: 'CLEANING' }
    })

    // Set ToTable to OCCUPIED
    await prisma.table.update({
        where: { id: toTableId },
        data: { status: 'OCCUPIED' }
    })

    revalidatePath('/dashboard/tables')
    return { success: true }
}

// ========== ORIGINAL ACTIONS ==========

export async function getTables() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    return await prisma.table.findMany({
        where: { storeId: user.defaultStoreId },
        orderBy: { name: 'asc' }
    })
}

// Get tables with held order timestamps for timer display (legacy, used by old UI)
export async function getTablesWithHeldOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    const [tables, heldOrders] = await Promise.all([
        prisma.table.findMany({
            where: { storeId: user.defaultStoreId },
            include: { floor: { select: { name: true } } },
            orderBy: { name: 'asc' }
        }),
        prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                status: 'HELD',
                tableId: { not: null }
            },
            select: {
                id: true,
                tableId: true,
                createdAt: true
            }
        })
    ])

    const heldOrderMap = new Map<string, { createdAt: Date; orderId: string }>()
    for (const order of heldOrders) {
        if (order.tableId) {
            const existing = heldOrderMap.get(order.tableId)
            if (!existing || order.createdAt < existing.createdAt) {
                heldOrderMap.set(order.tableId, { createdAt: order.createdAt, orderId: order.id })
            }
        }
    }

    const result = tables.map((table: any) => {
        const heldInfo = heldOrderMap.get(table.id)
        return {
            ...table,
            floorName: table.floor?.name || null,
            heldOrderCreatedAt: heldInfo?.createdAt.toISOString() || null,
            heldOrderId: heldInfo?.orderId || null
        }
    })

    return result
}

export async function addTable(name: string, capacity: number, floorId?: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        throw new Error("Unauthorized or No Store Selected")
    }

    // Check for duplicate name (scoped to this floor)
    const existingTable = await prisma.table.findFirst({
        where: {
            storeId: user.defaultStoreId,
            name: { equals: name, mode: 'insensitive' },
            floorId: floorId || null
        }
    })

    if (existingTable) {
        throw new Error(`Table "${name}" already exists on this floor`)
    }

    const table = await prisma.table.create({
        data: {
            name,
            capacity,
            storeId: user.defaultStoreId,
            status: 'AVAILABLE',
            floorId: floorId || null
        }
    })

    // Async Log
    logActivity(
        'CREATE_TABLE',
        'TABLES',
        { name, capacity, tableId: table.id, floorId },
        user.id
    ).catch((err: any) => console.error("Failed to log table creation", err))

    revalidatePath('/dashboard/tables')
    return table
}

export async function updateTableStatus(tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING') {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    const table = await prisma.table.update({
        where: {
            id: tableId,
            storeId: user.defaultStoreId
        },
        data: { status }
    })

    // If making available, clear any Held orders
    if (status === 'AVAILABLE') {
        await prisma.order.updateMany({
            where: {
                tableId: tableId,
                status: 'HELD'
            },
            data: {
                status: 'CANCELLED',
                tableId: null
            }
        })
    }

    logActivity(
        'UPDATE_TABLE_STATUS',
        'TABLES',
        { tableId, status },
        user.id
    ).catch((err: any) => console.error("Failed to log table status update", err))

    revalidatePath('/dashboard/tables')
    return table
}

export async function deleteTable(tableId: string) {
    try {
        const user = await getUserProfile()
        if (!user?.defaultStoreId) return { error: "Unauthorized" }

        await prisma.table.delete({
            where: {
                id: tableId,
                storeId: user.defaultStoreId
            }
        })

        logActivity(
            'DELETE_TABLE',
            'TABLES',
            { tableId },
            user.id
        ).catch((err: any) => console.error("Failed to log table deletion", err))

        revalidatePath('/dashboard/tables')
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete table" }
    }
}

/**
 * Generate or get QR token for a table
 */
export async function getTableQRToken(tableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    const table = await prisma.table.findFirst({
        where: { id: tableId, storeId: user.defaultStoreId }
    })

    if (!table) throw new Error("Table not found")

    // If no QR token, generate one
    if (!table.qrToken) {
        const token = `tbl_${tableId}_${Date.now()}`
        await prisma.table.update({
            where: { id: tableId },
            data: { qrToken: token }
        })
        return token
    }

    return table.qrToken
}
