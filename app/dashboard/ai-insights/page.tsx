
import { Metadata } from "next"
import { AIInsightsClient } from "./ai-insights-client"
import { getSmartInsights } from "@/app/actions/ai-analysis"
import { getTopSellingItems } from "@/app/actions/analytics"

export const metadata: Metadata = {
    title: "AI Insights | SyncServe",
    description: "Smart operational insights driven by data"
}

export default async function AIInsightsPage() {
    // Fetch initial data on server
    const [insights, topItems] = await Promise.all([
        getSmartInsights(),
        getTopSellingItems(5) // Top 5
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Smart Insights
                    </h2>
                    <p className="text-muted-foreground">
                        AI-driven operational intelligence to optimize your business.
                    </p>
                </div>
            </div>

            <AIInsightsClient
                initialInsights={insights}
                initialTopItems={topItems?.items || []}
            />
        </div>
    )
}
