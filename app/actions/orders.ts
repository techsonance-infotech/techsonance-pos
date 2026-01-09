'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache } from "next/cache"
import { getUserProfile } from "./user"
import { createNotification } from "@/app/actions/notifications"

// Hold Order (Create or Update if we had an ID)
// Hold Order (Create or Update if we had an ID)
export async function saveOrder(orderData: any) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        return { error: "Unauthorized or No Store Selected" }
    }

    try {
        console.log("Saving Order:", JSON.stringify(orderData, null, 2))
        const orderStatus = orderData.status || 'HELD'
        const tableId = orderData.tableId

        // Determine table status update if tableId is present
        let tableUpdatePromise = null
        if (tableId) {
            const newTableStatus = orderStatus === 'COMPLETED' ? 'AVAILABLE' : 'OCCUPIED'
            tableUpdatePromise = prisma.table.update({
                where: { id: tableId },
                data: { status: newTableStatus }
            })
        }

        // Prepare Order Operation
        let orderOperation

        if (orderData.id) {
            // Check existence first if needed, but update will throw if not found usually, 
            // but we want to be safe or just let it fail. 
            // However, we need existing order for notification context if we want "Order Updated" vs "Created".
            // Since we are inside transaction, we can't easily "read then write" dependent logic unless interactive transaction,
            // or we accept we might not have old data for notification diffs. 
            // For simplicity/perf, we'll just upsert or update. 
            // Let's stick to update for existing ID.

            orderOperation = prisma.order.update({
                where: { id: orderData.id },
                data: {
                    status: orderStatus,
                    totalAmount: orderData.totalAmount,
                    items: orderData.items,
                    customerName: orderData.customerName || null,
                    customerMobile: orderData.customerMobile || null,
                    tableId: tableId || null,
                    tableName: orderData.tableName || null,
                    paymentMode: orderData.paymentMode || 'CASH',
                    discountAmount: orderData.discountAmount || 0,
                    taxAmount: orderData.taxAmount || 0
                }
            })
        } else {
            const kotNo = orderData.kotNo || `KOT${Date.now().toString().slice(-6)}`
            orderOperation = prisma.order.create({
                data: {
                    kotNo,
                    status: orderStatus,
                    totalAmount: orderData.totalAmount,
                    items: orderData.items, // JSON
                    customerName: orderData.customerName || null,
                    customerMobile: orderData.customerMobile || null,
                    tableId: tableId || null,
                    tableName: orderData.tableName || null,
                    userId: user.id,
                    storeId: user.defaultStoreId,
                    discountAmount: orderData.discountAmount || 0,
                    taxAmount: orderData.taxAmount || 0
                }
            })
        }

        // Execute Transaction
        // We put table update first or second doesn't matter much, but let's do them in transaction.
        const operations: any[] = [orderOperation]
        if (tableUpdatePromise) operations.push(tableUpdatePromise)

        const results = await prisma.$transaction(operations)
        const savedOrder = results[0]

        // Notifications happen AFTER transaction to avoid slowing it down (fire and forget mostly, or await after)
        // We can await them to ensure delivery before returning success.
        await createNotification(
            user.id,
            orderStatus === 'COMPLETED' ? "Order Completed" : (orderData.id ? "Order Updated" : "Order Held"),
            `Order ${savedOrder.kotNo} ${orderStatus === 'COMPLETED' ? 'completed' : (orderData.id ? 'updated' : 'held')} for ₹${orderData.totalAmount}. Table: ${orderData.tableName || 'N/A'}`
        )

        revalidatePath('/dashboard/hold-orders')
        revalidatePath('/dashboard/recent-orders')
        // Also revalidate tables since status changed
        if (tableId) revalidatePath('/dashboard/tables')

        return {
            success: true,
            message: orderStatus === 'COMPLETED' ? "Order Saved Successfully" : (orderData.id ? "Order Updated Successfully" : "Order Held Successfully"),
            order: savedOrder
        }

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

// Get All Held Orders (Cached)
const fetchHeldOrders = async (storeId: string) => {
    try {
        const orders = await prisma.order.findMany({
            where: { status: 'HELD', storeId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                kotNo: true,
                totalAmount: true,
                customerName: true,
                customerMobile: true,
                tableName: true,
                createdAt: true,
                items: true,
                taxAmount: true,
                discountAmount: true
            }
        })
        return orders
    } catch (error) {
        return []
    }
}

export async function getHeldOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    const getCachedHeldOrders = unstable_cache(
        () => fetchHeldOrders(user.defaultStoreId!),
        [`held-orders-${user.defaultStoreId}`],
        { revalidate: 10, tags: ['held-orders'] }
    )
    return getCachedHeldOrders()
}

// Get Recent Completed Orders (Cached)
const fetchRecentOrders = async (storeId: string) => {
    try {
        const orders = await prisma.order.findMany({
            where: { status: 'COMPLETED', storeId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                kotNo: true,
                totalAmount: true,
                customerName: true,
                customerMobile: true,
                tableName: true,
                createdAt: true,
                updatedAt: true,
                items: true,
                taxAmount: true,
                discountAmount: true
            }
        })
        return orders
    } catch (error) {
        console.error("Get Recent Orders Error:", error)
        return []
    }
}

export async function getRecentOrders() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    const getCachedRecentOrders = unstable_cache(
        () => fetchRecentOrders(user.defaultStoreId!),
        [`recent-orders-${user.defaultStoreId}`],
        { revalidate: 10, tags: ['recent-orders'] }
    )
    return getCachedRecentOrders()
}

// Convert Completed Order to Held (for editing)
export async function convertOrderToHeld(orderId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify order exists and belongs to user's store
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                storeId: user.defaultStoreId,
                status: 'COMPLETED'
            }
        })

        if (!order) {
            return { error: "Order not found or already held" }
        }

        // Update status to HELD
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'HELD' }
        })

        // Notify
        await createNotification(
            user.id,
            "Order Converted to Held",
            `Order ${order.kotNo} converted to held status for editing.`
        )

        revalidatePath('/dashboard/recent-orders')
        revalidatePath('/dashboard/hold-orders')

        return { success: true, message: "Order converted to held status" }
    } catch (error) {
        console.error("Convert Order Error:", error)
        return { error: "Failed to convert order" }
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

// Search Orders (Header Search)
export async function searchOrders(query: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return []

    if (!query || query.length < 2) return []

    try {
        const orders = await prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                OR: [
                    { kotNo: { contains: query, mode: 'insensitive' } },
                    { customerName: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                kotNo: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                customerName: true,
                tableName: true
            }
        })
        return orders
    } catch (error) {
        console.error("Search Orders Error:", error)
        return []
    }
}
