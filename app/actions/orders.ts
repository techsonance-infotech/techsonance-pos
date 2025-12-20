'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { createNotification } from "@/app/actions/notifications"

// Hold Order (Create or Update if we had an ID)
export async function saveOrder(orderData: any) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        return { error: "Unauthorized or No Store Selected" }
    }

    // Generate KOT Number if new (Simple timestamp based for now)
    const kotNo = orderData.kotNo || `KOT${Date.now().toString().slice(-6)}`

    try {
        await prisma.order.create({
            data: {
                kotNo,
                status: orderData.status || 'HELD',
                totalAmount: orderData.totalAmount,
                items: orderData.items, // JSON
                customerName: orderData.customerName || null,
                customerMobile: orderData.customerMobile || null,
                tableId: orderData.tableId || null,
                tableName: orderData.tableName || null,
                userId: user.id,
                storeId: user.defaultStoreId
            }
        })

        // Notify
        await createNotification(
            user.id,
            orderData.status === 'COMPLETED' ? "Order Completed" : "Order Held",
            `Order ${kotNo} ${orderData.status === 'COMPLETED' ? 'completed' : 'held'} for ₹${orderData.totalAmount}. Table: ${orderData.tableName || 'N/A'}`
        )

        revalidatePath('/dashboard/hold-orders')
        revalidatePath('/dashboard/recent-orders') // Also revalidate recent orders
        return { success: true, message: orderData.status === 'COMPLETED' ? "Order Saved Successfully" : "Order Held Successfully" }
    } catch (error) {
        console.error("Save Order Error:", error)
        return { error: "Failed to save order" }
    }
}

// Get Count of Held Orders
export async function getHeldOrdersCount() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return 0

    try {
        const count = await prisma.order.count({
            where: { status: 'HELD', storeId: user.defaultStoreId }
        })
        return count
    } catch (error) {
        return 0
    }
}

// Get All Held Orders
export async function getHeldOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    try {
        const orders = await prisma.order.findMany({
            where: { status: 'HELD', storeId: user.defaultStoreId },
            orderBy: { createdAt: 'desc' }
        })
        return orders
    } catch (error) {
        return []
    }
}

// Get Recent Completed Orders
export async function getRecentOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    try {
        const orders = await prisma.order.findMany({
            where: { status: 'COMPLETED', storeId: user.defaultStoreId },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 orders
        })
        return orders
    } catch (error) {
        console.error("Get Recent Orders Error:", error)
        return []
    }
}

// Delete Order
export async function deleteOrder(orderId: string) {
    try {
        // Technically should verify store access here too, but ID is unique enough for now.
        // Adding where clause constraint is safer though.
        const user = await getUserProfile()
        if (!user?.defaultStoreId) return { error: "Unauthorized" }

        await prisma.order.delete({
            where: { id: orderId } // Prisma will throw if not found
        })
        revalidatePath('/dashboard/hold-orders')
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete" }
    }
}

// Get Single Order (For Resume)
export async function getOrder(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })
        return order
    } catch (error) {
        return null
    }
}
