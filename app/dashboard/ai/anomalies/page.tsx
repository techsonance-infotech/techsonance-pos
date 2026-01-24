import { getAnomalyAnalysis } from "@/app/actions/ai-analysis"
import { AnomalyClient } from "./client"

export default async function AnomalyPage() {
    const data = await getAnomalyAnalysis()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Theft Prevention</h2>
                    <p className="text-muted-foreground">AI-detected anomalies in staff behavior.</p>
                </div>
            </div>

            <AnomalyClient initialData={data} />
        </div>
    )
}
