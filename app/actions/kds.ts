'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"

export async function getActiveKitchenOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        const orders = await prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                status: { not: 'CANCELLED' }, // Show active (Held/Completed) orders
                fulfillmentStatus: {
                    in: ['QUEUED', 'PREPARING', 'READY'] // Hide SERVED
                }
            },
            include: {
                // We need items to show the chef
                // Items is JSON string unfortunately in this schema version
                // But we don't need deep relation fetch if it's JSON
            },
            orderBy: {
                createdAt: 'asc' // Oldest first (FIFO)
            }
        })

        return { orders }
    } catch (error) {
        console.error("KDS Fetch Error:", error)
        return { error: "Failed to fetch kitchen orders" }
    }
}

export async function updateKitchenStatus(orderId: string, status: 'PREPARING' | 'READY' | 'SERVED') {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        const updateData: any = { fulfillmentStatus: status }

        // AI Data Collection: Capture granular timestamps
        if (status === 'PREPARING') updateData.kitchenStartedAt = new Date()
        if (status === 'READY') updateData.kitchenReadyAt = new Date()
        if (status === 'SERVED') updateData.kitchenServedAt = new Date()

        await prisma.order.update({
            where: { id: orderId, storeId: user.defaultStoreId },
            data: updateData
        })

        revalidatePath('/dashboard/kds')
        return { success: true }
    } catch (error) {
        return { error: "Failed to update status" }
    }
}
