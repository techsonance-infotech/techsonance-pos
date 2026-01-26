'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { startOfDay, endOfDay, subDays, addDays, format, getDay } from "date-fns"

// Forecast Result Interface
interface ForecastResult {
    historical: { date: string, sales: number }[]
    predicted: { date: string, sales: number, lowerBound: number, upperBound: number }[]
    accuracyScore: number // MAPE (simulated for now)
}

export async function getDemandForecast(): Promise<ForecastResult | { error: string }> {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }
    const storeId = user.defaultStoreId

    try {
        const today = new Date()
        const historyDays = 30
        const forecastDays = 7
        const startDate = startOfDay(subDays(today, historyDays))

        // 1. Fetch Historical Stats
        const dailySales = await prisma.$queryRaw<Array<{ date: Date, total: number }>>`
            SELECT DATE("createdAt") as date, SUM("totalAmount") as total
            FROM "Order"
            WHERE status = 'COMPLETED' AND "storeId" = ${storeId}
            AND "createdAt" >= ${startDate}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
        `

        // Fill missing dates with 0
        const historicalMap = new Map<string, number>()
        dailySales.forEach((d: { date: Date, total: number }) => historicalMap.set(format(new Date(d.date), 'yyyy-MM-dd'), Number(d.total)))

        const historicalData = []
        let totalSales = 0

        for (let i = historyDays; i >= 0; i--) {
            const d = subDays(today, i)
            const dateStr = format(d, 'yyyy-MM-dd')
            const sales = historicalMap.get(dateStr) || 0
            historicalData.push({ date: dateStr, sales })
            totalSales += sales
        }

        // 2. Simple Moving Average (SMA) Prediction
        // For a 7-day forecast, we can use the last 7 days average as a baseline, 
        // weighted by day-of-week trends if we had more data.
        // For MVP: Use 7-Day SMA.

        const last7Days = historicalData.slice(-7)
        const avgDailySales = last7Days.reduce((sum, d) => sum + d.sales, 0) / (last7Days.length || 1)

        // Generate Prediction
        const predictedData = []
        for (let i = 1; i <= forecastDays; i++) {
            const nextDate = addDays(today, i)

            // Add some noise/DayFactor for realism (e.g. Weekends +20%)
            const dayOfWeek = getDay(nextDate) // 0 = Sun, 6 = Sat
            let multiplier = 1.0
            if (dayOfWeek === 0 || dayOfWeek === 6) multiplier = 1.2

            const predictedSales = Math.round(avgDailySales * multiplier)

            // Confidence Interval (+/- 20% for MVP)
            const margin = predictedSales * 0.2

            predictedData.push({
                date: format(nextDate, 'yyyy-MM-dd'),
                sales: predictedSales,
                lowerBound: Math.round(predictedSales - margin),
                upperBound: Math.round(predictedSales + margin)
            })
        }

        return {
            historical: historicalData.slice(-14), // Return last 14 days for chart context
            predicted: predictedData,
            accuracyScore: 85 // Mocked accuracy for Phase 2 start
        }

    } catch (error) {
        console.error("Forecasting Error:", error)
        return { error: "Failed to generate forecast" }
    }
}
