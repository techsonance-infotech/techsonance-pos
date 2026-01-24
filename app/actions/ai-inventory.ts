'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { subDays, startOfDay } from "date-fns"

export async function getSmartRestockSuggestions() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }
    const storeId = user.defaultStoreId

    try {
        const daysToAnalyze = 30
        const safetyStockDays = 2 // Buffer
        const leadTimeDays = 2 // Default supplier lead time

        // 1. Get Consumption History (via Inventory Transactions OUT/WASTAGE or derived from Orders)
        // Since we don't have linked recipes fully populated in all orders yet, 
        // we'll rely on InventoryTransaction logs for "OUT" type which represents usage.

        const startDate = startOfDay(subDays(new Date(), daysToAnalyze))

        // Get total usage per ingredient in last 30 days
        const usageStats = await prisma.inventoryTransaction.groupBy({
            by: ['inventoryItemId'],
            where: {
                inventoryItem: { storeId },
                type: { in: ['OUT', 'WASTAGE'] }, // Usage + Waste = Demand
                createdAt: { gte: startDate }
            },
            _sum: { quantity: true }
        })

        // 2. Calculate Suggestions
        const suggestions = []

        for (const stat of usageStats) {
            const usageQty = stat._sum.quantity || 0
            const avgDailyUsage = usageQty / daysToAnalyze

            // Get Current Stock Info
            const item = await prisma.inventoryItem.findUnique({
                where: { id: stat.inventoryItemId },
                include: { ingredient: true }
            })

            if (!item) continue

            const itemLeadTime = leadTimeDays // Could be item-specific in future
            const safetyStock = avgDailyUsage * safetyStockDays

            // Reorder Point = (Demand * LeadTime) + SafetyStock
            // e.g. (2kg/day * 2 days) + 4kg buffer = 8kg
            const reorderPoint = Math.ceil((avgDailyUsage * itemLeadTime) + safetyStock)

            const currentStock = item.quantity

            if (currentStock <= reorderPoint) {
                // Suggest Economic Order Quantity (simplify to filling up to 10 days worth)
                const targetStock = avgDailyUsage * 10
                const suggestedQty = Math.ceil(Math.max(0, targetStock - currentStock))

                if (suggestedQty > 0) {
                    suggestions.push({
                        id: item.id,
                        name: item.ingredient.name,
                        currentStock,
                        unit: item.ingredient.unit,
                        avgDailyUsage: avgDailyUsage.toFixed(2),
                        reorderPoint,
                        suggestedQty,
                        reason: `Stock below reorder point (${reorderPoint} ${item.ingredient.unit})`
                    })
                }
            }
        }

        return { suggestions }

    } catch (error) {
        console.error("Restock Suggestion Error:", error)
        return { error: "Failed to calculate suggestions" }
    }
}
