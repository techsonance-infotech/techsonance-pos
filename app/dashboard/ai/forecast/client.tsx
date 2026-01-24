'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ForecastClientProps {
    initialData: any
}

export function ForecastClient({ initialData }: ForecastClientProps) {
    const { historical, forecast, trend, growthRate } = initialData || {}

    if (!historical || historical.length === 0) {
        return <div className="p-10 text-center">Not enough data to forecast.</div>
    }

    // Combine for charting
    const allPoints = [...historical, ...forecast]
    const maxSales = Math.max(...allPoints.map((p: any) => p.sales)) * 1.2

    // SVG Dimensions
    const width = 800
    const height = 300
    const padding = 40

    // Scale Functions
    const ScaleX = (index: number) => padding + (index * ((width - padding * 2) / (allPoints.length - 1)))
    const ScaleY = (value: number) => height - padding - (value * ((height - padding * 2) / maxSales))

    const historicalPath = historical.map((p: any, i: number) =>
        `${i === 0 ? 'M' : 'L'} ${ScaleX(i)} ${ScaleY(p.sales)}`
    ).join(' ')

    const forecastPath = forecast.map((p: any, i: number) =>
        `${i === 0 ? 'M' : 'L'} ${ScaleX(historical.length + i)} ${ScaleY(p.sales)}`
    ).join(' ')

    // Connect the lines
    const lastHist = historical[historical.length - 1]
    const firstCast = forecast[0]
    const connectionPath = `M ${ScaleX(historical.length - 1)} ${ScaleY(lastHist.sales)} L ${ScaleX(historical.length)} ${ScaleY(firstCast.sales)}`

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {trend === 'UP' ? <TrendingUp className="text-green-500 h-8 w-8" /> : <TrendingDown className="text-red-500 h-8 w-8" />}
                            <div className="text-2xl font-bold">{trend}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">projected Growth (30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {growthRate > 0 ? '+' : ''}₹{growthRate.toFixed(0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Standard</div>
                        <p className="text-xs text-muted-foreground">Based on Linear Regression</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>30-Day Sales Trend + 7-Day Forecast</CardTitle>
                    <CardDescription>
                        Gray line is actual history. <span className="text-green-500 font-bold">Green line</span> is the AI prediction.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="border rounded-md bg-slate-50">
                            {/* Grid Lines */}
                            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" />
                            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" />

                            {/* Historical Line */}
                            <path d={historicalPath} fill="none" stroke="#64748b" strokeWidth="2" />

                            {/* Forecast Line */}
                            <path d={forecastPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />

                            {/* Connection */}
                            <path d={connectionPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />

                            {/* Points */}
                            {allPoints.map((p: any, i: number) => (
                                <circle
                                    key={i}
                                    cx={ScaleX(i)}
                                    cy={ScaleY(p.sales)}
                                    r="3"
                                    className="fill-current text-slate-900"
                                >
                                    <title>{p.date}: ₹{p.sales.toFixed(0)}</title>
                                </circle>
                            ))}
                        </svg>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
