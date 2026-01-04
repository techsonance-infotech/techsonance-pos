'use server'

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export type DashboardStats = {
    todaySales: number
    totalOrders: number
    activeOrders: number
    holdOrders: number
}

export type RecentOrder = {
    id: string
    kotNo: string
    customerName: string | null
    totalAmount: number
    status: string
    type: 'DINE_IN' | 'TAKEAWAY'
    tableName: string | null
    createdAt: Date
}

export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    // Run all queries in parallel
    const [salesAgg, totalOrders, activeOrders, holdOrders] = await Promise.all([
        // 1. Today's Sales (Completed orders today)
        prisma.order.aggregate({
            where: {
                storeId,
                status: 'COMPLETED',
                createdAt: { gte: todayStart, lte: todayEnd }
            },
            _sum: { totalAmount: true }
        }),

        // 2. Total Orders (All orders created today)
        prisma.order.count({
            where: {
                storeId,
                createdAt: { gte: todayStart, lte: todayEnd }
            }
        }),

        // 3. Active Orders (HELD orders with a Table ID - Dine In)
        prisma.order.count({
            where: {
                storeId,
                status: 'HELD',
                tableId: { not: null }
            }
        }),

        // 4. Hold Orders (HELD orders without a Table ID - Quick/Takeaway)
        prisma.order.count({
            where: {
                storeId,
                status: 'HELD',
                tableId: null
            }
        })
    ])

    return {
        todaySales: salesAgg._sum.totalAmount || 0,
        totalOrders,
        activeOrders,
        holdOrders
    }
}

export async function getRecentOrders(storeId: string): Promise<RecentOrder[]> {
    const orders = await prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            kotNo: true,
            customerName: true, // or tableName if mostly dine-in
            totalAmount: true,
            status: true,
            tableId: true,
            tableName: true,
            createdAt: true
        }
    })

    return orders.map(o => ({
        id: o.id,
        kotNo: o.kotNo,
        customerName: o.customerName || (o.tableName ? `Table: ${o.tableName}` : "Walk-in Customer"),
        totalAmount: o.totalAmount,
        status: o.status,
        type: o.tableId ? 'DINE_IN' : 'TAKEAWAY',
        tableName: o.tableName,
        createdAt: o.createdAt
    }))
}
