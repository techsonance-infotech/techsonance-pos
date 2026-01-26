'use server'

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export type DashboardStats = {
    todaySales: number
    totalOrders: number
    activeOrders: number
    holdOrders: number
    paymentSplit: { mode: string; count: number; amount: number }[]
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

import { unstable_cache } from "next/cache"
import { getUserProfile } from "./user"

// Cache configuration
const CACHE_TAGS = (storeId: string) => [`dashboard-${storeId}`, `orders-${storeId}`]
const REVALIDATE_SECONDS = 30

// Internal Cached Fetchers
const getCachedDashboardStats = unstable_cache(
    async (storeId: string) => {
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Run all queries in parallel
        const [salesAgg, totalOrders, activeOrders, holdOrders, paymentSplitRaw] = await Promise.all([
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
            }),

            // 5. Payment Split
            prisma.order.groupBy({
                by: ['paymentMode'],
                where: {
                    storeId,
                    status: 'COMPLETED',
                    createdAt: { gte: todayStart, lte: todayEnd }
                },
                _count: { paymentMode: true },
                _sum: { totalAmount: true }
            })
        ])

        const paymentSplit = (paymentSplitRaw as any[]).map(p => ({
            mode: p.paymentMode || 'UNKNOWN',
            count: p._count.paymentMode,
            amount: p._sum.totalAmount || 0
        }))

        return {
            todaySales: salesAgg._sum.totalAmount || 0,
            totalOrders,
            activeOrders,
            holdOrders,
            paymentSplit
        }

    },
    ['get-dashboard-stats'], // Additional key parts are auto-generated from args (storeId)
    { revalidate: REVALIDATE_SECONDS, tags: ['dashboard-stats'] }
)

const getCachedRecentOrders = unstable_cache(
    async (storeId: string) => {
        const orders = await prisma.order.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                kotNo: true,
                customerName: true,
                totalAmount: true,
                status: true,
                tableId: true,
                tableName: true,
                createdAt: true
            }
        })

        return orders.map((o: any) => ({
            id: o.id,
            kotNo: o.kotNo,
            customerName: o.customerName || (o.tableName ? `Table: ${o.tableName}` : "Walk-in Customer"),
            totalAmount: o.totalAmount,
            status: o.status,
            type: o.tableId ? 'DINE_IN' : 'TAKEAWAY',
            tableName: o.tableName,
            createdAt: o.createdAt
        }))
    },
    ['get-recent-orders'],
    { revalidate: REVALIDATE_SECONDS, tags: ['recent-orders'] }
)


export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
    const user = await getUserProfile()
    if (!user || user.defaultStoreId !== storeId) {
        throw new Error("Unauthorized Access")
    }

    // Use cached fetcher
    return await getCachedDashboardStats(storeId)
}

export async function getRecentOrders(storeId: string): Promise<RecentOrder[]> {
    const user = await getUserProfile()
    if (!user || user.defaultStoreId !== storeId) {
        throw new Error("Unauthorized Access")
    }

    // Use cached fetcher
    return await getCachedRecentOrders(storeId)
}
