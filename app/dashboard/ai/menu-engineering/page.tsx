import { getMenuEngineeringAnalysis } from "@/app/actions/ai-analysis"
import { MenuEngineeringClient } from "./client"

export default async function MenuEngineeringPage() {
    // Default: Last 30 Days
    const analysis = await getMenuEngineeringAnalysis()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Menu Engineering</h2>
                <p className="text-muted-foreground">The "BCG Matrix" for your menu.</p>
            </div>

            <MenuEngineeringClient initialData={analysis} />
        </div>
    )
}
