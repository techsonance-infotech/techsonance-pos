'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns"
import { unstable_cache } from "next/cache"

// Check if user has analytics access
async function checkAnalyticsAccess() {
    const user = await getUserProfile()
    if (!user) throw new Error("Unauthorized")

    const allowedRoles = ['SUPER_ADMIN', 'BUSINESS_OWNER']
    if (!allowedRoles.includes(user.role)) {
        throw new Error("Access denied. Analytics is only available to Super Admin and Business Owner.")
    }

    if (!user.defaultStoreId) throw new Error("No store selected")

    return { user, storeId: user.defaultStoreId }
}

// Sales Overview - Quick summary stats (Parallelized + Cached)
export async function getSalesOverview() {
    const { storeId } = await checkAnalyticsAccess()

    const getCachedOverview = unstable_cache(
        async () => {
            const today = new Date()
            const startToday = startOfDay(today)
            const endToday = endOfDay(today)
            const startWeek = startOfDay(subDays(today, 7))
            const startMonth = startOfMonth(today)

            // Run all queries in parallel
            const [todaySales, weekSales, monthSales, last7Days] = await Promise.all([
                prisma.order.aggregate({
                    where: { storeId, status: 'COMPLETED', createdAt: { gte: startToday, lte: endToday } },
                    _sum: { totalAmount: true },
                    _count: true
                }),
                prisma.order.aggregate({
                    where: { storeId, status: 'COMPLETED', createdAt: { gte: startWeek } },
                    _sum: { totalAmount: true },
                    _count: true
                }),
                prisma.order.aggregate({
                    where: { storeId, status: 'COMPLETED', createdAt: { gte: startMonth } },
                    _sum: { totalAmount: true },
                    _count: true
                }),
                prisma.$queryRaw<Array<{ date: Date, total: number }>>`
                    SELECT DATE("createdAt") as date, SUM("totalAmount") as total
                    FROM "Order"
                    WHERE status = 'COMPLETED' AND "storeId" = ${storeId}
                    AND "createdAt" >= ${startWeek}
                    GROUP BY DATE("createdAt")
                    ORDER BY date ASC
                `
            ])

            return {
                today: { sales: todaySales._sum.totalAmount || 0, orders: todaySales._count },
                week: { sales: weekSales._sum.totalAmount || 0, orders: weekSales._count },
                month: { sales: monthSales._sum.totalAmount || 0, orders: monthSales._count },
                topCategory: 'N/A',
                trend: last7Days.map((d: { date: Date, total: number }) => ({ date: format(new Date(d.date), 'MMM dd'), sales: Number(d.total) }))
            }
        },
        [`sales-overview-${storeId}`],
        { revalidate: 30, tags: ['analytics'] }
    )
    return getCachedOverview()
}

// Daily Sales Report
export async function getDailySalesReport(date: Date) {
    const { storeId } = await checkAnalyticsAccess()

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Total sales for the day
    const dailyStats = await prisma.order.aggregate({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true },
        _count: true,
        _avg: { totalAmount: true }
    })

    // Hourly breakdown
    const hourlyData = await prisma.$queryRaw<Array<{ hour: number, total: number, count: number }>>`
        SELECT EXTRACT(HOUR FROM "createdAt")::integer as hour, SUM("totalAmount") as total, COUNT(*) as count
        FROM "Order"
        WHERE status = 'COMPLETED' AND "storeId" = ${storeId}
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour ASC
    `

    // Order list
    const orders = await prisma.order.findMany({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        orderBy: { createdAt: 'desc' }
    })

    return {
        date: format(date, 'yyyy-MM-dd'),
        totalSales: dailyStats._sum.totalAmount || 0,
        orderCount: dailyStats._count,
        averageOrderValue: dailyStats._avg.totalAmount || 0,
        hourlyBreakdown: hourlyData.map((h: { hour: number, total: number, count: number }) => ({
            hour: h.hour,
            sales: Number(h.total),
            orders: Number(h.count)
        })),
        orders: orders.map((o: any) => ({
            id: o.id,
            kotNo: o.kotNo,
            time: format(new Date(o.createdAt), 'HH:mm'),
            customer: o.customerName || 'Guest',
            items: Array.isArray(o.items) ? o.items.length : 0,
            total: o.totalAmount
        }))
    }
}

// Category-wise Sales Report
export async function getCategoryWiseReport(startDate: Date, endDate: Date) {
    const { storeId } = await checkAnalyticsAccess()

    // Get all orders in date range
    const orders = await prisma.order.findMany({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        select: {
            items: true,
            totalAmount: true
        }
    })

    // Since items are JSON and we don't have category info, return simplified data
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0)

    return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        categories: [{
            id: '1',
            name: 'All Items',
            revenue: totalRevenue,
            quantity: orders.reduce((sum: number, o: any) => sum + (Array.isArray(o.items) ? o.items.length : 0), 0),
            orders: orders.length,
            percentage: 100
        }],
        totalRevenue
    }
}

// Date Range Report
export async function getDateRangeReport(startDate: Date, endDate: Date) {
    const { storeId } = await checkAnalyticsAccess()

    // Overall stats
    const stats = await prisma.order.aggregate({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true },
        _count: true,
        _avg: { totalAmount: true }
    })

    // Daily breakdown
    const dailyData = await prisma.$queryRaw<Array<{ date: Date, total: number, count: number }>>`
        SELECT DATE("createdAt") as date, SUM("totalAmount") as total, COUNT(*) as count
        FROM "Order"
        WHERE status = 'COMPLETED' AND "storeId" = ${storeId}
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
    `

    // Detailed transactions
    const transactions = await prisma.order.findMany({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit for performance
    })

    return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        totalSales: stats._sum.totalAmount || 0,
        orderCount: stats._count,
        averageOrderValue: stats._avg.totalAmount || 0,
        dailyBreakdown: dailyData.map((d: { date: Date, total: number, count: number }) => ({
            date: format(new Date(d.date), 'MMM dd'),
            sales: Number(d.total),
            orders: Number(d.count)
        })),
        transactions: transactions.map((t: any) => ({
            id: t.id,
            date: format(new Date(t.createdAt), 'MMM dd, yyyy'),
            time: format(new Date(t.createdAt), 'HH:mm'),
            customer: t.customerName || 'Guest',
            items: Array.isArray(t.items) ? t.items.length : 0,
            total: t.totalAmount
        }))
    }
}

// Monthly Sales Report
export async function getMonthlySalesReport(year: number) {
    const { storeId } = await checkAnalyticsAccess()

    const monthlyData = await prisma.$queryRaw<Array<{ month: number, total: number, count: number }>>`
        SELECT EXTRACT(MONTH FROM "createdAt")::integer as month, SUM("totalAmount") as total, COUNT(*) as count
        FROM "Order"
        WHERE status = 'COMPLETED' AND "storeId" = ${storeId}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        GROUP BY EXTRACT(MONTH FROM "createdAt")
        ORDER BY month ASC
    `

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Fill in missing months with 0
    const fullYearData = monthNames.map((name: string, index: number) => {
        const monthData = monthlyData.find((m: { month: number }) => m.month === index + 1)
        return {
            month: name,
            sales: monthData ? Number(monthData.total) : 0,
            orders: monthData ? Number(monthData.count) : 0
        }
    })

    const totalYearSales = fullYearData.reduce((sum: number, m: any) => sum + m.sales, 0)
    const bestMonth = fullYearData.reduce((best: any, current: any) =>
        current.sales > best.sales ? current : best
    )

    return {
        year,
        months: fullYearData,
        totalSales: totalYearSales,
        bestMonth: bestMonth.month
    }
}

// Top Selling Items Report
export async function getTopSellingItems(limit: number = 10, startDate?: Date, endDate?: Date) {
    const { storeId } = await checkAnalyticsAccess()

    const start = startDate || startOfMonth(new Date())
    const end = endDate || endOfMonth(new Date())

    // Get all orders in date range
    const orders = await prisma.order.findMany({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: start, lte: end }
        },
        select: {
            items: true,
            totalAmount: true
        }
    })

    // Parse items from JSON and aggregate
    const itemMap = new Map<string, { name: string, quantity: number, revenue: number, orders: Set<string> }>()

    orders.forEach((order: any, orderIndex: number) => {
        if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                const key = item.name || `Item ${orderIndex}`
                const existing = itemMap.get(key) || { name: key, quantity: 0, revenue: 0, orders: new Set() }
                existing.quantity += item.quantity || 1
                existing.revenue += (item.quantity || 1) * (item.price || 0)
                existing.orders.add(orderIndex.toString())
                itemMap.set(key, existing)
            })
        }
    })

    // Convert to array and sort by quantity
    const topItems = Array.from(itemMap.entries())
        .map(([id, data]: [string, any]) => ({
            id,
            name: data.name,
            category: 'General',
            quantitySold: data.quantity,
            revenue: data.revenue,
            orders: data.orders.size
        }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, limit)

    return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        items: topItems.map((item: any, index: number) => ({
            rank: index + 1,
            ...item
        }))
    }
}

// Payment Method Analysis
export async function getPaymentMethodAnalysis(startDate: Date, endDate: Date) {
    const { storeId } = await checkAnalyticsAccess()

    // Note: Payment method field doesn't exist in Order schema
    // Returning all sales as "Cash" for now
    const totalSales = await prisma.order.aggregate({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true },
        _count: true
    })

    const totalRevenue = totalSales._sum.totalAmount || 0

    return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        methods: [{
            method: 'Cash',
            revenue: totalRevenue,
            transactions: totalSales._count,
            percentage: 100
        }],
        totalRevenue
    }
}

// Profit & Loss Report (Revenue-based)
export async function getProfitLossReport(month: number, year: number) {
    const { storeId } = await checkAnalyticsAccess()

    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)

    // Current month revenue
    const currentMonth = await prisma.order.aggregate({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true },
        _count: true
    })

    // Previous month for comparison
    const prevMonthStart = new Date(year, month - 2, 1)
    const prevMonthEnd = endOfMonth(prevMonthStart)

    const previousMonth = await prisma.order.aggregate({
        where: {
            storeId,
            status: 'COMPLETED',
            createdAt: { gte: prevMonthStart, lte: prevMonthEnd }
        },
        _sum: { totalAmount: true }
    })

    const currentRevenue = currentMonth._sum.totalAmount || 0
    const previousRevenue = previousMonth._sum.totalAmount || 0
    const growth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100)
        : 0

    return {
        month: format(startDate, 'MMMM yyyy'),
        revenue: currentRevenue,
        orders: currentMonth._count,
        previousMonthRevenue: previousRevenue,
        growth: growth,
        averageOrderValue: currentMonth._count > 0 ? currentRevenue / currentMonth._count : 0
    }
}
