'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function getSalesReport(startDate?: string, endDate?: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    const start = startDate ? startOfDay(parseISO(startDate)) : startOfDay(new Date())
    const end = endDate ? endOfDay(parseISO(endDate)) : endOfDay(new Date())

    try {
        const orders = await prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                status: { in: ['COMPLETED', 'CANCELLED'] }, // Include cancelled for tracking stats? 
                // Mostly reports want Net Sales (COMPLETED).
                // Let's filter COMPLETED for financials, and count cancelled separately.
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                user: true // Cashier info
            }
        })

        // 1. Summary Stats
        const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED')
        const cancelledOrders = orders.filter((o: any) => o.status === 'CANCELLED')

        const totalSales = completedOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0)
        const totalTax = completedOrders.reduce((sum: number, o: any) => sum + o.taxAmount, 0)
        const totalDiscount = completedOrders.reduce((sum: number, o: any) => sum + o.discountAmount, 0)

        // 2. Payment Modes
        const paymentModes = {
            CASH: completedOrders.filter((o: any) => o.paymentMode === 'CASH').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
            CARD: completedOrders.filter((o: any) => o.paymentMode === 'CARD').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
            UPI: completedOrders.filter((o: any) => o.paymentMode === 'UPI').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
            OTHER: completedOrders.filter((o: any) => o.paymentMode === 'OTHER').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
        }

        // 3. Hourly Sales (Simple breakdown)
        const hourlySales = new Array(24).fill(0)
        completedOrders.forEach((o: any) => {
            const hour = o.createdAt.getHours()
            hourlySales[hour] += o.totalAmount
        })

        return {
            summary: {
                totalOrders: completedOrders.length,
                totalSales,
                totalTax,
                totalDiscount,
                avgOrderValue: completedOrders.length ? (totalSales / completedOrders.length) : 0,
                cancelledCount: cancelledOrders.length
            },
            paymentModes,
            hourlySales,
            dateRange: { start, end }
        }

    } catch (error) {
        console.error("Sales Report Error:", error)
        return { error: "Failed to fetch report" }
    }
}

export async function getItemSalesReport(startDate?: string, endDate?: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    // This is computationally heavy if we parse JSON items for thousands of orders.
    // For MVP, we can do it in memory for small datasets.
    // Ideally, we should have OrderItem table. 
    // Since `items` is JSON string in Order model (SQLite limitation work around in early schema),
    // we must parse it.

    const start = startDate ? startOfDay(parseISO(startDate)) : startOfDay(new Date())
    const end = endDate ? endOfDay(parseISO(endDate)) : endOfDay(new Date())

    try {
        const orders = await prisma.order.findMany({
            where: {
                storeId: user.defaultStoreId,
                status: 'COMPLETED',
                createdAt: { gte: start, lte: end }
            },
            select: { items: true }
        })

        const itemMap = new Map<string, { name: string, qty: number, revenue: number }>()

        orders.forEach((order: any) => {
            try {
                const items = JSON.parse(order.items as string)
                if (Array.isArray(items)) {
                    items.forEach((item: any) => {
                        // Key by ID or Name
                        const key = item.productId || item.name
                        const existing = itemMap.get(key) || { name: item.name, qty: 0, revenue: 0 }

                        existing.qty += (item.quantity || 1)
                        existing.revenue += (item.price * (item.quantity || 1))

                        itemMap.set(key, existing)
                    })
                }
            } catch (e) {
                // Ignore parse error
            }
        })

        // Convert map to array and sort
        const topItems = Array.from(itemMap.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10) // Top 10

        return { topItems }

    } catch (error) {
        return { error: "Failed to fetch item report" }
    }
}
