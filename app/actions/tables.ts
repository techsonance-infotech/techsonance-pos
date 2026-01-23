'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { logActivity } from "@/lib/logger"

export async function getTables() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    return await prisma.table.findMany({
        where: { storeId: user.defaultStoreId },
        orderBy: { name: 'asc' }
    })
}

// Get tables with held order timestamps for timer display
export async function getTablesWithHeldOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    // Fetch all tables
    const tables = await prisma.table.findMany({
        where: { storeId: user.defaultStoreId },
        orderBy: { name: 'asc' }
    })

    // Fetch all held orders for this store that have a tableId
    const heldOrders = await prisma.order.findMany({
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

    // Create a map of tableId -> { createdAt, orderId }
    const heldOrderMap = new Map<string, { createdAt: Date; orderId: string }>()
    for (const order of heldOrders) {
        if (order.tableId) {
            const existing = heldOrderMap.get(order.tableId)
            if (!existing || order.createdAt < existing.createdAt) {
                heldOrderMap.set(order.tableId, { createdAt: order.createdAt, orderId: order.id })
            }
        }
    }

    // Merge table data with held order info
    const result = tables.map((table: { id: string; name: string; capacity: number; status: string }) => {
        const heldInfo = heldOrderMap.get(table.id)
        return {
            ...table,
            heldOrderCreatedAt: heldInfo?.createdAt.toISOString() || null,
            heldOrderId: heldInfo?.orderId || null
        }
    })

    return result
}

export async function addTable(name: string, capacity: number) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        throw new Error("Unauthorized or No Store Selected")
    }

    // Check for duplicate name
    const existingTable = await prisma.table.findFirst({
        where: {
            storeId: user.defaultStoreId,
            name: {
                equals: name, // generic 'equals' might be case-sensitive depending on DB. SQLite is case-insensitive usually.
                // To be safe and consistently strict or lenient, usually strict for exact name.
            }
        }
    })

    if (existingTable) {
        throw new Error("Table with this name already exists")
    }

    const table = await prisma.table.create({
        data: {
            name,
            capacity,
            storeId: user.defaultStoreId,
            status: 'AVAILABLE'
        }
    })

    try {
        await logActivity(
            'CREATE_TABLE',
            'TABLES',
            { name, capacity, tableId: table.id },
            user.id
        )
    } catch (e) {
        console.error("Failed to log table creation", e)
    }

    return table
}

export async function updateTableStatus(tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED') {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) throw new Error("Unauthorized")

    const table = await prisma.table.update({
        where: {
            id: tableId,
            storeId: user.defaultStoreId // Strict isolation
        },
        data: { status }
    })


    // If making available, ensure we clear any Held orders preventing the timer from reappearing
    if (status === 'AVAILABLE') {
        await prisma.order.updateMany({
            where: {
                tableId: tableId,
                status: 'HELD'
            },
            data: {
                status: 'CANCELLED',
                tableId: null // Detach from table
            }
        })
    }

    try {
        await logActivity(
            'UPDATE_TABLE_STATUS',
            'TABLES',
            { tableId, status },
            user.id
        )
    } catch (e) {
        console.error("Failed to log table status update", e)
    }

    return table
}

export async function deleteTable(tableId: string) {
    try {
        const user = await getUserProfile()
        if (!user?.defaultStoreId) return { error: "Unauthorized" }

        await prisma.table.delete({
            where: {
                id: tableId,
                storeId: user.defaultStoreId // Strict isolation
            }
        })

        await logActivity(
            'DELETE_TABLE',
            'TABLES',
            { tableId },
            user.id
        )

        return { success: true }
    } catch (error) {
        return { error: "Failed to delete table" }
    }
}
