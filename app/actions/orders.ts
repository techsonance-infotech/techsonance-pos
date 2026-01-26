'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache } from "next/cache"
import { getUserProfile } from "./user"
import { createNotification } from "@/app/actions/notifications"
import { logAudit } from "@/lib/audit"

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
                    taxAmount: orderData.taxAmount || 0,
                    // We typically don't change shiftId on update, as it belongs to creator?
                    // Unless we track "Updater's Shift"? For now keep original.
                }
            })
        } else {
            // Find Active Shift for User
            const activeShift = await prisma.shift.findFirst({
                where: {
                    userId: user.id,
                    storeId: user.defaultStoreId,
                    status: 'OPEN'
                }
            })

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
                    taxAmount: orderData.taxAmount || 0,
                    shiftId: activeShift?.id, // Link to shift if exists

                    // AI Data Collection: If not held, it's accepted by system/kitchen
                    kitchenAcceptedAt: orderStatus !== 'HELD' ? new Date() : null
                }
            })
        }

        // Execute Transaction
        const operations: any[] = [orderOperation]
        if (tableUpdatePromise) operations.push(tableUpdatePromise)

        const results = await prisma.$transaction(operations)
        const savedOrder = results[0]

        // Notifications
        await createNotification(
            user.id,
            orderStatus === 'COMPLETED' ? "Order Completed" : (orderData.id ? "Order Updated" : "Order Held"),
            `Order ${savedOrder.kotNo} ${orderStatus === 'COMPLETED' ? 'completed' : (orderData.id ? 'updated' : 'held')} for ₹${orderData.totalAmount}. Table: ${orderData.tableName || 'N/A'}`
        )

        // Log Audit
        const actionType = orderData.id
            ? (orderStatus === 'HELD' ? 'UPDATE_HOLD' : 'UPDATE_ORDER')
            : (orderStatus === 'HELD' ? 'HOLD_ORDER' : 'CREATE_ORDER')

        const isCompletion = orderStatus === 'COMPLETED'

        await logAudit({
            action: orderData.id ? 'UPDATE' : 'CREATE',
            module: 'POS',
            entityType: 'Order',
            entityId: savedOrder.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: `Order ${savedOrder.kotNo} ${isCompletion ? 'completed' : 'saved'} with status ${orderStatus}. Total: ₹${orderData.totalAmount}`,
            severity: isCompletion ? 'MEDIUM' : 'LOW',
            after: {
                status: orderStatus,
                total: orderData.totalAmount,
                kotNo: savedOrder.kotNo,
                itemsCount: Array.isArray(orderData.items) ? orderData.items.length : 0
            }
        })

        revalidatePath('/dashboard/hold-orders')
        revalidatePath('/dashboard/recent-orders')
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
            where: {
                status: {
                    in: ['COMPLETED', 'CANCELLED']
                },
                storeId
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                kotNo: true,
                totalAmount: true,
                status: true,
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

// Convert Completed Order to Held
export async function convertOrderToHeld(orderId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) {
        return { error: "Unauthorized" }
    }

    try {
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

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'HELD' }
        })

        await createNotification(
            user.id,
            "Order Converted to Held",
            `Order ${order.kotNo} converted to held status for editing.`
        )

        // Log Audit
        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Order',
            entityId: orderId,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: `Order ${order.kotNo} reopened (converted to HELD)`,
            severity: 'MEDIUM',
            before: { status: 'COMPLETED' },
            after: { status: 'HELD' }
        })

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
        const user = await getUserProfile()
        if (!user?.defaultStoreId) return { error: "Unauthorized" }

        const orderToDelete = await prisma.order.findUnique({
            where: { id: orderId, storeId: user.defaultStoreId }
        })

        await prisma.order.delete({
            where: {
                id: orderId,
                storeId: user.defaultStoreId
            }
        })

        await logAudit({
            action: 'DELETE',
            module: 'POS',
            entityType: 'Order',
            entityId: orderId,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: `Deleted order ${orderToDelete?.kotNo || orderId}`,
            severity: 'HIGH',
            before: orderToDelete
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
        const user = await getUserProfile()
        if (!user?.defaultStoreId) return null

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
                storeId: user.defaultStoreId
            }
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

// Cancel Order (Update Status + Release Table)
export async function cancelOrder(orderId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
                storeId: user.defaultStoreId
            }
        })

        if (!order) return { error: "Order not found" }

        const operations: any[] = []

        operations.push(prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
        }))

        if (order.tableId) {
            operations.push(prisma.table.update({
                where: { id: order.tableId },
                data: { status: 'AVAILABLE' }
            }))
        }

        await prisma.$transaction(operations)

        // Notification
        await createNotification(
            user.id,
            "Order Cancelled",
            `Order ${order.kotNo} was cancelled. Table released.`
        )

        // Log Audit
        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Order',
            entityId: orderId,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: `Order ${order.kotNo} cancelled`,
            severity: 'HIGH',
            before: { status: order.status },
            after: { status: 'CANCELLED' }
        })

        revalidatePath('/dashboard/hold-orders')
        revalidatePath('/dashboard/recent-orders')
        revalidatePath('/dashboard/tables')

        return { success: true, message: "Order cancelled and table released" }
    } catch (error) {
        console.error("Cancel Order Error:", error)
        return { error: "Failed to cancel order" }
    }
}


// Submit Feedback (AI Phase 1)
export async function submitFeedback(data: { orderId: string, rating: number, comment?: string }) {
    try {
        // Validation (Basic)
        if (!data.orderId || !data.rating) return { error: "Missing required fields" }

        // Create Feedback
        const feedback = await prisma.feedback.create({
            data: {
                orderId: data.orderId,
                rating: data.rating,
                comment: data.comment
            }
        })

        // Log Audit (Anonymous or System, usually triggered by guest)
        // We'll use a placeholder user ID or check if session exists (unlikely for QR).
        await logAudit({
            action: 'CREATE',
            module: 'AI', // Feedback feeds AI
            entityType: 'Feedback',
            entityId: feedback.id,
            userId: 'GUEST',
            // userRoleId: 'CUSTOMER',
            storeId: undefined, // Ideally fetch order to get storeId, but for speed skipping extra fetch if not strict.
            // Actually, let's look up order for context if possible? 
            // For now, minimal log to avoid latency.
            reason: `Customer Rating: ${data.rating}/5`,
            severity: 'LOW'
        })

        return { success: true }
    } catch (error) {
        console.error("Submit Feedback Error:", error)
        return { error: "Failed to submit feedback" }
    }
}

// Optimization: Get Filtered Orders (Paginated)
export async function getFilteredOrders(params: {
    storeId: string
    search?: string
    status?: string
    date?: string
    page?: number
    limit?: number
}) {
    const { storeId, search, status, date, page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const where: any = {
        storeId,
        // Default to not showing HELD orders in "Recent Orders" unless requested?
        // Recent Orders typically shows Completed/Cancelled. Held are in "Hold Orders".
        // If status is specific, use it. If 'ALL', we show COMPLETED/CANCELLED.
        status: status && status !== 'ALL'
            ? status
            : { in: ['COMPLETED', 'CANCELLED'] }
    }

    if (search) {
        where.OR = [
            { kotNo: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerMobile: { contains: search, mode: 'insensitive' } }
        ]
    }

    if (date) {
        // Date String YYYY-MM-DD
        const start = new Date(date)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)
        if (!isNaN(start.getTime())) {
            where.createdAt = {
                gte: start,
                lte: end
            }
        }
    }

    try {
        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    kotNo: true,
                    totalAmount: true,
                    status: true,
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
        ])

        return {
            orders,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        }
    } catch (error) {
        console.error("Get Filtered Orders Error:", error)
        return { orders: [], total: 0, totalPages: 0, currentPage: 1 }
    }
}
