'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSalesReport, getItemSalesReport } from "@/app/actions/reports"
import { toast } from "sonner"

// Re-using chart components if available, else simple HTML bars
// Since Rechcarts is not installed, we use pure CSS bars.

interface ReportsClientProps {
    initialSales: any
    initialItems: any
    storeId: string
}

export function ReportsClient({ initialSales, initialItems }: ReportsClientProps) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [salesData, setSalesData] = useState(initialSales)
    const [itemData, setItemData] = useState(initialItems)
    const [isLoading, setIsLoading] = useState(false)

    const handleDateSelect = async (newDate: Date | undefined) => {
        setDate(newDate)
        if (newDate) {
            setIsLoading(true)
            const start = newDate.toISOString()
            const end = newDate.toISOString() // Backend handles start/end of day

            const [newSales, newItems] = await Promise.all([
                getSalesReport(start, end),
                getItemSalesReport(start, end)
            ])

            setSalesData(newSales)
            setItemData(newItems)
            setIsLoading(false)
        }
    }

    const { summary, paymentModes, hourlySales } = salesData || {}
    const { topItems } = itemData || {}

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={date ? format(date, "yyyy-MM-dd") : ''}
                            onChange={(e) => {
                                const d = e.target.value ? new Date(e.target.value) : undefined
                                handleDateSelect(d)
                            }}
                        />
                    </div>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.totalSales?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary?.totalOrders} Orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(summary?.totalSales - (summary?.totalTax || 0)).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Excluding Tax (₹{summary?.totalTax?.toFixed(2)})
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Discounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{summary?.totalDiscount?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">
                            Given today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.avgOrderValue?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Payment Breakdown */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Payment Methods</CardTitle>
                        <CardDescription>Sales distribution by mode</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(paymentModes || {}).map(([mode, amount]: [string, any]) => {
                                const total = summary?.totalSales || 1
                                const percent = (amount / total) * 100
                                return (
                                    <div key={mode} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{mode}</span>
                                            <span>₹{amount.toFixed(2)} ({percent.toFixed(1)}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Items */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Top Selling Items</CardTitle>
                        <CardDescription>By Quantity Sold</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topItems?.length === 0 && <p className="text-muted-foreground text-sm">No sales data found.</p>}
                            {topItems?.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-xs">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.qty} units sold</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm">
                                        ₹{item.revenue.toFixed(2)}
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
