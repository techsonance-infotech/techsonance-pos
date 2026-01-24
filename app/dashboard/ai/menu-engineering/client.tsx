'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, AlertCircle, Star } from "lucide-react"

interface MenuEngineeringClientProps {
    initialData: any
}

export function MenuEngineeringClient({ initialData }: MenuEngineeringClientProps) {
    const { metrics, summary } = initialData || {}

    if (!metrics || metrics.length === 0) {
        return <div className="p-10 text-center">No sales data available to analyze.</div>
    }

    const stars = metrics.filter((m: any) => m.quadrant === 'STAR')
    const plowhorses = metrics.filter((m: any) => m.quadrant === 'PLOWHORSE')
    const puzzles = metrics.filter((m: any) => m.quadrant === 'PUZZLE')
    const dogs = metrics.filter((m: any) => m.quadrant === 'DOG')

    const maxSold = Math.max(...metrics.map((m: any) => m.soldQty)) * 1.1
    const maxMargin = Math.max(...metrics.map((m: any) => m.unitMargin)) * 1.1

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Stars 🌟</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stars.length} Items</div>
                        <p className="text-xs text-muted-foreground">High Profit & Popular</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Plowhorses 🐎</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plowhorses.length} Items</div>
                        <p className="text-xs text-muted-foreground">Popular but Low Margin</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Puzzles 🧩</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{puzzles.length} Items</div>
                        <p className="text-xs text-muted-foreground">High Margin but Low Sales</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Dogs 🐕</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dogs.length} Items</div>
                        <p className="text-xs text-muted-foreground">Low Profit & Unpopular</p>
                    </CardContent>
                </Card>
            </div>

            {/* Matrix Chart & Table */}
            <div className="grid gap-6 lg:grid-cols-7">

                {/* Visual Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Menu Matrix</CardTitle>
                        <CardDescription>Visual distribution of your menu items</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative h-[400px] w-full border rounded-md bg-slate-50 p-4">
                            {/* Axis Labels */}
                            <div className="absolute left-[-20px] top-1/2 -rotate-90 text-xs font-bold text-muted-foreground">Profitability (Margin) ➔</div>
                            <div className="absolute bottom-[-20px] left-1/2 text-xs font-bold text-muted-foreground">Popularity (Sales Qty) ➔</div>

                            {/* Quadrant Dividers */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 border-dashed border-l border-slate-400" />
                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-300 border-dashed border-t border-slate-400" />

                            {/* Labels for Quadrants */}
                            <div className="absolute top-2 left-2 text-xs font-bold text-purple-600">PUZZLE</div>
                            <div className="absolute top-2 right-2 text-xs font-bold text-yellow-600">STAR</div>
                            <div className="absolute bottom-2 left-2 text-xs font-bold text-red-600">DOG</div>
                            <div className="absolute bottom-2 right-2 text-xs font-bold text-blue-600">PLOWHORSE</div>

                            {/* Dots */}
                            {metrics.map((m: any) => {
                                const left = (m.soldQty / maxSold) * 100
                                const bottom = (m.unitMargin / maxMargin) * 100

                                let color = "bg-gray-500"
                                if (m.quadrant === 'STAR') color = "bg-yellow-500"
                                if (m.quadrant === 'PLOWHORSE') color = "bg-blue-500"
                                if (m.quadrant === 'PUZZLE') color = "bg-purple-500"
                                if (m.quadrant === 'DOG') color = "bg-red-500"

                                return (
                                    <div
                                        key={m.id}
                                        className={`absolute w-3 h-3 rounded-full ${color} hover:w-4 hover:h-4 hover:scale-125 transition-all cursor-pointer shadow-sm`}
                                        style={{ left: `${left}%`, bottom: `${bottom}%` }}
                                        title={`${m.name}: Sold ${m.soldQty}, Margin ₹${m.unitMargin.toFixed(0)} (${m.quadrant})`}
                                    />
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations List */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>AI Insights</CardTitle>
                        <CardDescription>Actionable recommendations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {metrics.slice(0, 10).map((m: any) => (
                                <div key={m.id} className="flex items-start gap-4 border-b pb-3 last:border-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted font-bold">
                                        {m.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{m.name}</span>
                                            <Badge variant={
                                                m.quadrant === 'STAR' ? 'secondary' :
                                                    m.quadrant === 'DOG' ? 'destructive' : 'outline'
                                            } className="text-[10px] h-5">
                                                {m.quadrant}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {m.recommendation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
