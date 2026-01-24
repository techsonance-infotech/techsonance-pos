'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { subDays, startOfDay } from "date-fns"

export async function getMenuEngineeringData() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }
    const storeId = user.defaultStoreId

    try {
        const days = 30
        const startDate = startOfDay(subDays(new Date(), days))

        // 1. Fetch Sales Data
        const orders = await prisma.order.findMany({
            where: {
                storeId,
                status: 'COMPLETED',
                createdAt: { gte: startDate }
            },
            select: { items: true }
        })

        // 2. Aggregate Item Data
        const itemStats = new Map<string, {
            name: string,
            sold: number,
            revenue: number,
            cost: number
        }>()

        let totalItemsSold = 0

        orders.forEach((order: any) => {
            if (Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                    totalItemsSold += (item.quantity || 1)
                    const stats = itemStats.get(item.id) || {
                        name: item.name,
                        sold: 0,
                        revenue: 0,
                        cost: 0
                    }
                    stats.sold += (item.quantity || 1)
                    stats.revenue += (item.quantity || 1) * (item.unitPrice || 0)

                    // Mock Cost (40% of price if unknown, ideally from Recipe)
                    const unitCost = item.unitCost || (item.unitPrice * 0.4)
                    stats.cost += (item.quantity || 1) * unitCost

                    itemStats.set(item.id, stats)
                })
            }
        })

        if (itemStats.size === 0) return { matrix: [] }

        // 3. Calculate Metrics
        const matrix = []
        const avgPopularity = totalItemsSold / itemStats.size // Average items sold per menu item

        // Calculate Average Contribution Margin
        let totalMargin = 0
        const items = Array.from(itemStats.values())
        items.forEach(i => totalMargin += (i.revenue - i.cost))
        const avgMargin = totalMargin / totalItemsSold

        for (const [id, stat] of itemStats.entries()) {
            const margin = (stat.revenue - stat.cost) / stat.sold
            const popularity = stat.sold

            // Classification Logic
            let classification = 'DOG' // Low Pop, Low Margin
            if (popularity >= avgPopularity && margin >= avgMargin) classification = 'STAR'
            else if (popularity >= avgPopularity && margin < avgMargin) classification = 'PLOWHORSE'
            else if (popularity < avgPopularity && margin >= avgMargin) classification = 'PUZZLE'

            // Recommendation
            let recommendation = ""
            switch (classification) {
                case 'STAR': recommendation = "Promote & Maintain"; break;
                case 'PLOWHORSE': recommendation = "Increase Price slightly"; break;
                case 'PUZZLE': recommendation = "Run Marketing / Discount"; break;
                case 'DOG': recommendation = "Remove from Menu"; break;
            }

            matrix.push({
                id,
                name: stat.name,
                popularity, // X-axis
                margin,     // Y-axis
                classification,
                recommendation,
                revenue: stat.revenue
            })
        }

        return {
            matrix,
            averages: { avgPopularity, avgMargin }
        }

    } catch (error) {
        console.error("Menu Engineering Error:", error)
        return { error: "Failed to analyze menu" }
    }
}
