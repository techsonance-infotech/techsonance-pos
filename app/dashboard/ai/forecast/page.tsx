import { getSalesForecast } from "@/app/actions/ai-analysis"
import { ForecastClient } from "./client"

export default async function ForecastPage() {
    const data = await getSalesForecast()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Demand Forecasting</h2>
                <p className="text-muted-foreground">Predict future sales using ML Regression.</p>
            </div>

            <ForecastClient initialData={data} />
        </div>
    )
}
