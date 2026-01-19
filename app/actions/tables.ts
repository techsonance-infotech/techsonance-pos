'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"

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

    const table = await prisma.table.create({
        data: {
            name,
            capacity,
            storeId: user.defaultStoreId,
            status: 'AVAILABLE'
        }
    })
    return table
}

export async function updateTableStatus(tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED') {
    const table = await prisma.table.update({
        where: { id: tableId },
        data: { status }
    })
    return table
}

export async function deleteTable(tableId: string) {
    try {
        await prisma.table.delete({
            where: { id: tableId }
        })
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete table" }
    }
}
