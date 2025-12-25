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
