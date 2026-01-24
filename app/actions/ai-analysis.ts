'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { startOfDay, endOfDay, subDays } from "date-fns"

export async function getSmartInsights() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }
    const storeId = user.defaultStoreId

    try {
        const today = new Date()
        const startToday = startOfDay(today)
        const endToday = endOfDay(today)

        // 1. Stock Risk (Items with low stock)
        // Assuming inventory item has `quantity` and `ingredient.minStock`
        const lowStockItems = await prisma.inventoryItem.findMany({
            where: {
                storeId,
                quantity: { lte: 5 } // Simple rule for now: < 5 units
            },
            include: { ingredient: true },
            take: 5
        })

        // 2. Anomaly Detection (Enhanced Z-Score)
        // Fetch last 14 days of cancellations
        const pastCancellations = await prisma.$queryRaw<Array<{ date: Date, count: number }>>`
            SELECT DATE("updatedAt") as date, COUNT(*) as count 
            FROM "Order" 
            WHERE status = 'CANCELLED' AND "storeId" = ${storeId}
            AND "updatedAt" >= ${subDays(today, 14)}
            GROUP BY DATE("updatedAt")
        `

        const counts = pastCancellations.map(p => Number(p.count))
        const values = counts.length > 0 ? counts : [0]
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length) || 1

        // Today's count
        const todayCancelled = await prisma.order.count({
            where: {
                storeId,
                status: 'CANCELLED',
                updatedAt: { gte: startToday, lte: endToday }
            }
        })

        const zScore = (todayCancelled - mean) / stdDev
        const anomalies = []

        if (zScore > 2 && todayCancelled > 2) { // 2 Sigma rule + minimum threshold
            anomalies.push({
                type: 'HIGH_CANCELLATION',
                message: `Abnormal cancellation spike (Z-Score: ${zScore.toFixed(1)}). ${todayCancelled} cancellations vs avg ${mean.toFixed(1)}.`,
                severity: 'HIGH'
            })
        } else if (todayCancelled > 3 && counts.length < 5) {
            // Fallback for low data
            anomalies.push({
                type: 'HIGH_CANCELLATION',
                message: `Unusual number of cancellations today (${todayCancelled})`,
                severity: 'MEDIUM'
            })
        }

        // 3. Kitchen Performance (Avg Prep Time)
        // Only for orders that have both timestamps
        const completedOrders = await prisma.order.findMany({
            where: {
                storeId,
                fulfillmentStatus: { in: ['READY', 'SERVED'] },
                kitchenStartedAt: { not: null },
                kitchenReadyAt: { not: null },
                createdAt: { gte: startToday }
            },
            select: { kitchenStartedAt: true, kitchenReadyAt: true }
        })

        let avgPrepTime = 0
        if (completedOrders.length > 0) {
            const totalDuration = completedOrders.reduce((sum, order) => {
                return sum + (order.kitchenReadyAt!.getTime() - order.kitchenStartedAt!.getTime())
            }, 0)
            avgPrepTime = Math.round((totalDuration / completedOrders.length) / 1000 / 60) // Minutes
        }

        return {
            stockRisks: lowStockItems.map(item => ({
                id: item.id,
                name: item.ingredient.name,
                quantity: item.quantity,
                unit: item.ingredient.unit
            })),
            anomalies,
            kitchenPerformance: {
                avgPrepTimeMinutes: avgPrepTime,
                ordersProcessed: completedOrders.length
            }
        }

    } catch (error) {
        console.error("Smart Insights Error:", error)
        return { error: "Failed to fetch insights" }
    }
}
