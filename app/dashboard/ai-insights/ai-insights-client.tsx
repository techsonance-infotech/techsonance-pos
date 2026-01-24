"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, Clock, Sparkles, ShoppingBag, UtensilsCrossed, Star, Search, Dog, LineChart } from "lucide-react"

interface AIInsightsClientProps {
    initialInsights: any
    initialTopItems: any[]
    aiData: {
        forecast: any
        restock: any[]
        menuMatrix: any[]
        menuAverages: any
    }
}

export function AIInsightsClient({ initialInsights, initialTopItems, aiData }: AIInsightsClientProps) {
    const { anomalies, kitchenPerformance } = initialInsights
    const { forecast, restock, menuMatrix } = aiData

    // Forecast Chart (Simple SVG)
    const renderForecastChart = () => {
        if (!forecast || !forecast.predicted) return null
        const allPoints = [...forecast.historical, ...forecast.predicted]
        if (allPoints.length === 0) return null

        const maxSales = Math.max(...allPoints.map((p: any) => p.sales)) * 1.1

        return (
            <div className="h-40 w-full flex items-end gap-1.5 mt-6 px-2">
                {allPoints.map((p: any, i: number) => {
                    const isPredicted = i >= forecast.historical.length;
                    const h = (p.sales / maxSales) * 100
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative transition-all duration-300 hover:scale-105">
                            <div
                                className={`w-full mx-0.5 rounded-t-md shadow-sm transition-all duration-300 group-hover:brightness-110 ${isPredicted ? 'bg-gradient-to-t from-purple-400 to-purple-300' : 'bg-gradient-to-t from-blue-500 to-blue-400'}`}
                                style={{ height: `${h}%` }}
                            />
                            {/* Floating Date Label */}
                            <span className="text-[10px] text-gray-400 mt-2 hidden sm:block md:hidden lg:block truncate w-full text-center opacity-70">
                                {p.date.slice(5)}
                            </span>
                            {/* Premium Tooltip */}
                            <div className="absolute bottom-full mb-2 bg-slate-900/90 backdrop-blur text-white text-xs py-1 px-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity duration-200">
                                <div className="font-semibold">{p.date}</div>
                                <div>{p.sales} Sales {isPredicted ? '(Proj)' : ''}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

            {/* ROW 1: Operations (Anomalies & Kitchen) - Full Width */}
            <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kitchen Efficiency */}
                <Card className="bg-gradient-to-br from-white to-blue-50 border-none shadow-md backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base text-blue-900">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            Kitchen Efficiency (Today)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-8 mt-2">
                            <div>
                                <div className="text-4xl font-extrabold text-blue-950">{kitchenPerformance?.avgPrepTimeMinutes || 0}<span className="text-lg font-medium text-blue-400">m</span></div>
                                <div className="text-xs font-medium text-blue-400 uppercase tracking-wide">Avg Prep Time</div>
                            </div>
                            <div>
                                <div className="text-4xl font-extrabold text-blue-950">{kitchenPerformance?.ordersProcessed || 0}</div>
                                <div className="text-xs font-medium text-blue-400 uppercase tracking-wide">Orders Cleared</div>
                            </div>
                            <div className="ml-auto">
                                <Badge className={`text-md px-3 py-1 ${kitchenPerformance?.avgPrepTimeMinutes > 20 ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                    {kitchenPerformance?.avgPrepTimeMinutes > 20 ? 'Slow' : 'Optimal'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Anomalies */}
                <Card className={`border-none shadow-md transition-colors duration-500 ${anomalies?.length > 0 ? "bg-gradient-to-br from-white to-red-50" : "bg-gradient-to-br from-white to-green-50"}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <div className={`p-2 rounded-lg ${anomalies?.length > 0 ? "bg-red-100" : "bg-green-100"}`}>
                                <AlertCircle className={`h-5 w-5 ${anomalies?.length > 0 ? "text-red-500" : "text-green-500"}`} />
                            </div>
                            <span className={anomalies?.length > 0 ? "text-red-900" : "text-green-900"}>Operational Health</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="min-h-[80px] flex flex-col justify-center">
                            {anomalies && anomalies.length > 0 ? (
                                anomalies.map((alert: any, i: number) => (
                                    <div key={i} className="text-sm text-red-700 bg-red-100/50 p-2 rounded-md flex items-center gap-2 mb-2 last:mb-0 border border-red-100">
                                        <span className="font-bold flex h-5 w-5 items-center justify-center bg-red-200 rounded-full text-xs">!</span>
                                        {alert.message}
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-green-700 bg-green-100/50 p-3 rounded-md flex items-center gap-2 border border-green-100">
                                    <Sparkles className="h-4 w-4" /> All systems running smoothly. No anomalies detected.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* ROW 2: Demand Forecast (4 Cols) & Restock (3 Cols) */}
            <div className="col-span-4">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5 text-purple-600" />
                            Demand Forecast (7 Days)
                        </CardTitle>
                        <CardDescription>
                            AI Prediction based on 30-day SMA trend.
                            <span className="ml-2 font-semibold text-purple-600">
                                Next 7 Days: ~{forecast?.predicted?.reduce((a: any, b: any) => a + b.sales, 0)} orders
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderForecastChart()}
                        <div className="flex gap-4 justify-center mt-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Historical
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-300 rounded-sm"></div> Prediction
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-3">
                <Card className="h-full border-l-4 border-l-amber-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-amber-500" />
                            Smart Replenishment
                        </CardTitle>
                        <CardDescription>Suggested restocks to avoid stockouts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {restock.length > 0 ? (
                            restock.slice(0, 5).map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <div className="font-semibold text-sm">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.currentStock} {item.unit} left</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-amber-700 text-sm">+{item.suggestedQty} {item.unit}</div>
                                        <div className="text-[10px] text-amber-600">to order</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Stock levels optimal. No reorders needed.
                            </div>
                        )}
                        {restock.length > 5 && (
                            <div className="text-center text-xs text-blue-600 cursor-pointer pt-2">
                                View all {restock.length} suggestions
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ROW 3: Menu Matrix (Full Width) */}
            <div className="col-span-full">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <UtensilsCrossed className="h-5 w-5 text-indigo-600" />
                            </div>
                            Menu Engineering
                            <span className="text-sm font-normal text-muted-foreground ml-2">(Stars vs Dogs)</span>
                        </CardTitle>
                        <CardDescription>BCG Matrix Analysis for Profitability optimization</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {/* Stars */}
                            <div className="group relative bg-gradient-to-b from-green-50 to-white p-5 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Star className="h-12 w-12 text-green-600" />
                                </div>
                                <div className="flex items-center gap-2 mb-3 font-bold text-lg text-green-800">
                                    <Star className="h-5 w-5 fill-green-500 text-green-600" /> Stars
                                </div>
                                <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-4 border-b border-green-200 pb-2">High Profit · High Volume</div>
                                <div className="flex flex-wrap gap-2">
                                    {menuMatrix.filter(m => m.classification === 'STAR').length > 0 ? (
                                        menuMatrix.filter(m => m.classification === 'STAR').slice(0, 5).map(m => (
                                            <Badge key={m.id} className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">{m.name}</Badge>
                                        ))
                                    ) : <span className="text-xs text-muted-foreground italic">No items found</span>}
                                </div>
                            </div>

                            {/* Plowhorses */}
                            <div className="group relative bg-gradient-to-b from-amber-50 to-white p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <TrendingUp className="h-12 w-12 text-amber-600" />
                                </div>
                                <div className="flex items-center gap-2 mb-3 font-bold text-lg text-amber-800">
                                    <TrendingUp className="h-5 w-5 text-amber-600" /> Plowhorses
                                </div>
                                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-4 border-b border-amber-200 pb-2">Low Profit · High Volume</div>
                                <div className="flex flex-wrap gap-2">
                                    {menuMatrix.filter(m => m.classification === 'PLOWHORSE').length > 0 ? (
                                        menuMatrix.filter(m => m.classification === 'PLOWHORSE').slice(0, 5).map(m => (
                                            <Badge key={m.id} className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">{m.name}</Badge>
                                        ))
                                    ) : <span className="text-xs text-muted-foreground italic">No items found</span>}
                                </div>
                            </div>

                            {/* Puzzles */}
                            <div className="group relative bg-gradient-to-b from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Search className="h-12 w-12 text-blue-600" />
                                </div>
                                <div className="flex items-center gap-2 mb-3 font-bold text-lg text-blue-800">
                                    <Search className="h-5 w-5 text-blue-600" /> Puzzles
                                </div>
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4 border-b border-blue-200 pb-2">High Profit · Low Volume</div>
                                <div className="flex flex-wrap gap-2">
                                    {menuMatrix.filter(m => m.classification === 'PUZZLE').length > 0 ? (
                                        menuMatrix.filter(m => m.classification === 'PUZZLE').slice(0, 5).map(m => (
                                            <Badge key={m.id} className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">{m.name}</Badge>
                                        ))
                                    ) : <span className="text-xs text-muted-foreground italic">No items found</span>}
                                </div>
                            </div>

                            {/* Dogs */}
                            <div className="group relative bg-gradient-to-b from-gray-50 to-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Dog className="h-12 w-12 text-gray-600" />
                                </div>
                                <div className="flex items-center gap-2 mb-3 font-bold text-lg text-gray-700">
                                    <Dog className="h-5 w-5 text-gray-500" /> Dogs
                                </div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Low Profit · Low Volume</div>
                                <div className="flex flex-wrap gap-2">
                                    {menuMatrix.filter(m => m.classification === 'DOG').length > 0 ? (
                                        menuMatrix.filter(m => m.classification === 'DOG').slice(0, 5).map(m => (
                                            <Badge key={m.id} className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">{m.name}</Badge>
                                        ))
                                    ) : <span className="text-xs text-muted-foreground italic">No items found</span>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}
