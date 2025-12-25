"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    TrendingUp, DollarSign, ShoppingCart, Package,
    Calendar, Download, BarChart3, PieChart as PieChartIcon,
    Clock, CreditCard, Loader2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/analytics/stat-card"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { ExportButton } from "@/components/analytics/export-button"
import { BarChart, LineChart, PieChart } from "@/components/analytics/charts"
import {
    getSalesOverview,
    getDailySalesReport,
    getCategoryWiseReport,
    getDateRangeReport,
    getMonthlySalesReport,
    getTopSellingItems,
    getPaymentMethodAnalysis,
    getProfitLossReport
} from "@/app/actions/analytics"
import { getUserProfile } from "@/app/actions/user"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import { subDays, startOfMonth, endOfMonth } from "date-fns"
import { toast } from "sonner"

export default function AnalyticsPage() {
    const router = useRouter()
    const { currency } = useCurrency()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")

    // Date range state
    const [startDate, setStartDate] = useState(startOfMonth(new Date()))
    const [endDate, setEndDate] = useState(endOfMonth(new Date()))

    // Data state
    const [overview, setOverview] = useState<any>(null)
    const [dailyReport, setDailyReport] = useState<any>(null)
    const [categoryReport, setCategoryReport] = useState<any>(null)
    const [dateRangeData, setDateRangeData] = useState<any>(null)
    const [monthlyReport, setMonthlyReport] = useState<any>(null)
    const [topItems, setTopItems] = useState<any>(null)
    const [paymentAnalysis, setPaymentAnalysis] = useState<any>(null)
    const [profitLoss, setProfitLoss] = useState<any>(null)

    // Check access on mount
    useEffect(() => {
        checkAccess()
    }, [])

    async function checkAccess() {
        try {
            const user = await getUserProfile()
            if (!user) {
                router.push('/login')
                return
            }

            const allowedRoles = ['SUPER_ADMIN', 'BUSINESS_OWNER']
            if (!allowedRoles.includes(user.role)) {
                toast.error("Access denied. Analytics is only available to Super Admin and Business Owner.")
                router.push('/dashboard')
                return
            }

            // Load initial data
            loadOverview()
            setLoading(false)
        } catch (error: any) {
            toast.error(error.message || "Access denied")
            router.push('/dashboard')
        }
    }

    async function loadOverview() {
        try {
            const data = await getSalesOverview()
            console.log('Overview data loaded:', data)

            // Ensure all required properties exist
            if (!data || !data.today || !data.week || !data.month || !data.trend) {
                throw new Error('Invalid overview data structure')
            }

            setOverview(data)
        } catch (error: any) {
            console.error('Failed to load overview:', error)
            toast.error(error.message || "Failed to load overview")

            // Set default data to prevent crashes
            setOverview({
                today: { sales: 0, orders: 0 },
                week: { sales: 0, orders: 0 },
                month: { sales: 0, orders: 0 },
                topCategory: 'N/A',
                trend: []
            })
        }
    }

    async function loadDailyReport(date: Date) {
        try {
            const data = await getDailySalesReport(date)
            setDailyReport(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load daily report")
        }
    }

    async function loadCategoryReport() {
        try {
            const data = await getCategoryWiseReport(startDate, endDate)
            setCategoryReport(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load category report")
        }
    }

    async function loadDateRangeReport() {
        try {
            const data = await getDateRangeReport(startDate, endDate)
            setDateRangeData(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load date range report")
        }
    }

    async function loadMonthlyReport() {
        try {
            const data = await getMonthlySalesReport(new Date().getFullYear())
            setMonthlyReport(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load monthly report")
        }
    }

    async function loadTopItems() {
        try {
            const data = await getTopSellingItems(10, startDate, endDate)
            setTopItems(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load top items")
        }
    }

    async function loadPaymentAnalysis() {
        try {
            const data = await getPaymentMethodAnalysis(startDate, endDate)
            setPaymentAnalysis(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load payment analysis")
        }
    }

    async function loadProfitLoss() {
        try {
            const now = new Date()
            const data = await getProfitLossReport(now.getMonth() + 1, now.getFullYear())
            setProfitLoss(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load profit & loss")
        }
    }

    // Load data when tab changes
    useEffect(() => {
        if (loading) return

        switch (activeTab) {
            case "daily":
                if (!dailyReport) loadDailyReport(new Date())
                break
            case "category":
                if (!categoryReport) loadCategoryReport()
                break
            case "daterange":
                if (!dateRangeData) loadDateRangeReport()
                break
            case "monthly":
                if (!monthlyReport) loadMonthlyReport()
                break
            case "topitems":
                if (!topItems) loadTopItems()
                break
            case "payment":
                if (!paymentAnalysis) loadPaymentAnalysis()
                break
            case "profitloss":
                if (!profitLoss) loadProfitLoss()
                break
        }
    }, [activeTab, loading])

    // Reload data when date range changes
    useEffect(() => {
        if (loading) return
        if (activeTab === "category") loadCategoryReport()
        if (activeTab === "daterange") loadDateRangeReport()
        if (activeTab === "topitems") loadTopItems()
        if (activeTab === "payment") loadPaymentAnalysis()
    }, [startDate, endDate])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading Analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
                    <p className="text-gray-500 mt-1">Comprehensive business insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onDateChange={(start, end) => {
                            setStartDate(start)
                            setEndDate(end)
                        }}
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="category">Category</TabsTrigger>
                    <TabsTrigger value="daterange">Date Range</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="topitems">Top Items</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="profitloss">P&L</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {overview && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    title="Today's Sales"
                                    value={formatCurrency(overview.today.sales, currency.symbol)}
                                    subtitle={`${overview.today.orders} orders`}
                                    icon={<DollarSign className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="This Week"
                                    value={formatCurrency(overview.week.sales, currency.symbol)}
                                    subtitle={`${overview.week.orders} orders`}
                                    icon={<TrendingUp className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="This Month"
                                    value={formatCurrency(overview.month.sales, currency.symbol)}
                                    subtitle={`${overview.month.orders} orders`}
                                    icon={<BarChart3 className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Top Category"
                                    value={overview.topCategory}
                                    subtitle="Best performing"
                                    icon={<Package className="h-6 w-6" />}
                                />
                            </div>

                            {/* Sales Trend Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
                                <LineChart
                                    data={overview.trend.map((t: any) => ({
                                        label: t.date,
                                        value: t.sales
                                    }))}
                                    height={300}
                                    valuePrefix={currency.symbol}
                                />
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Daily Sales Tab */}
                <TabsContent value="daily" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Daily Sales Report</h2>
                        <input
                            type="date"
                            className="px-4 py-2 border border-gray-200 rounded-lg"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            onChange={(e) => loadDailyReport(new Date(e.target.value))}
                        />
                    </div>

                    {dailyReport && (
                        <>
                            {/* Daily Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title="Total Sales"
                                    value={formatCurrency(dailyReport.totalSales, currency.symbol)}
                                    icon={<DollarSign className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Orders"
                                    value={dailyReport.orderCount}
                                    icon={<ShoppingCart className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Avg Order Value"
                                    value={formatCurrency(dailyReport.averageOrderValue, currency.symbol)}
                                    icon={<TrendingUp className="h-6 w-6" />}
                                />
                            </div>

                            {/* Hourly Breakdown */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Hourly Sales Breakdown</h3>
                                <BarChart
                                    data={dailyReport.hourlyBreakdown.map((h: any) => ({
                                        label: `${h.hour}:00`,
                                        value: h.sales
                                    }))}
                                    height={300}
                                    valuePrefix={currency.symbol}
                                />
                            </div>

                            {/* Orders List */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">Orders</h3>
                                    <ExportButton
                                        data={dailyReport.orders}
                                        filename={`daily-sales-${dailyReport.date}`}
                                    />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">KOT No</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dailyReport.orders.map((order: any) => (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">{order.time}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{order.kotNo || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{order.customer}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{order.items}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {formatCurrency(order.total, currency.symbol)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Category-wise Tab - Will continue in next message due to length */}
                <TabsContent value="category" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Category-wise Sales Report</h2>
                        {categoryReport && (
                            <ExportButton
                                data={categoryReport.categories}
                                filename={`category-report-${categoryReport.startDate}-${categoryReport.endDate}`}
                            />
                        )}
                    </div>

                    {categoryReport && (
                        <>
                            {/* Total Revenue Card */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                                <p className="text-blue-100 mb-2">Total Revenue</p>
                                <h3 className="text-4xl font-bold">{formatCurrency(categoryReport.totalRevenue, currency.symbol)}</h3>
                                <p className="text-blue-100 mt-2 text-sm">
                                    {categoryReport.startDate} to {categoryReport.endDate}
                                </p>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bar Chart */}
                                <div className="bg-white rounded-xl border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Category</h3>
                                    <BarChart
                                        data={categoryReport.categories.map((cat: any) => ({
                                            label: cat.name,
                                            value: cat.revenue
                                        }))}
                                        height={300}
                                        valuePrefix={currency.symbol}
                                    />
                                </div>

                                {/* Pie Chart */}
                                <div className="bg-white rounded-xl border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Distribution</h3>
                                    <div className="flex justify-center">
                                        <PieChart
                                            data={categoryReport.categories.map((cat: any, index: number) => ({
                                                label: cat.name,
                                                value: cat.revenue
                                            }))}
                                            size={250}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Category Table */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Orders</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% of Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {categoryReport.categories.map((cat: any) => (
                                                <tr key={cat.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                        {formatCurrency(cat.revenue, currency.symbol)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{cat.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{cat.orders}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {(cat.percentage || 0).toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Date Range Report Tab */}
                <TabsContent value="daterange" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Date Range Report</h2>
                        {dateRangeData && (
                            <ExportButton
                                data={dateRangeData.transactions}
                                filename={`date-range-${dateRangeData.startDate}-${dateRangeData.endDate}`}
                            />
                        )}
                    </div>

                    {dateRangeData && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title="Total Sales"
                                    value={formatCurrency(dateRangeData.totalSales, currency.symbol)}
                                    icon={<DollarSign className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Total Orders"
                                    value={dateRangeData.orderCount}
                                    icon={<ShoppingCart className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Avg Order Value"
                                    value={formatCurrency(dateRangeData.averageOrderValue, currency.symbol)}
                                    icon={<TrendingUp className="h-6 w-6" />}
                                />
                            </div>

                            {/* Daily Trend Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Sales Trend</h3>
                                <LineChart
                                    data={dateRangeData.dailyBreakdown.map((d: any) => ({
                                        label: d.date,
                                        value: d.sales
                                    }))}
                                    height={300}
                                    valuePrefix={currency.symbol}
                                />
                            </div>

                            {/* Transactions Table */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dateRangeData.transactions.map((txn: any) => (
                                                <tr key={txn.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">{txn.date}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{txn.time}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{txn.customer}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{txn.items}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {formatCurrency(txn.total, currency.symbol)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Monthly Sales Report Tab */}
                <TabsContent value="monthly" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Monthly Sales Report</h2>
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-lg"
                            defaultValue={new Date().getFullYear()}
                            onChange={(e) => {
                                const year = parseInt(e.target.value)
                                getMonthlySalesReport(year).then(setMonthlyReport)
                            }}
                        >
                            {[2024, 2025, 2026].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {monthlyReport && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                                    <p className="text-green-100 mb-2">Total Annual Sales</p>
                                    <h3 className="text-4xl font-bold">{formatCurrency(monthlyReport.totalSales, currency.symbol)}</h3>
                                    <p className="text-green-100 mt-2 text-sm">Year {monthlyReport.year}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                                    <p className="text-purple-100 mb-2">Best Performing Month</p>
                                    <h3 className="text-4xl font-bold">{monthlyReport.bestMonth}</h3>
                                    <p className="text-purple-100 mt-2 text-sm">Highest revenue month</p>
                                </div>
                            </div>

                            {/* Monthly Bar Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Sales by Month</h3>
                                <BarChart
                                    data={monthlyReport.months.map((m: any) => ({
                                        label: m.month,
                                        value: m.sales
                                    }))}
                                    height={350}
                                    valuePrefix={currency.symbol}
                                />
                            </div>

                            {/* Monthly Table */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Month</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Sales</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Orders</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {monthlyReport.months.map((month: any, index: number) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{month.month}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                        {formatCurrency(month.sales, currency.symbol)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{month.orders}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Top Selling Items Tab */}
                <TabsContent value="topitems" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Top Selling Items</h2>
                        {topItems && (
                            <ExportButton
                                data={topItems.items}
                                filename={`top-items-${topItems.startDate}-${topItems.endDate}`}
                            />
                        )}
                    </div>

                    {topItems && (
                        <>
                            {/* Top 3 Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {topItems.items.slice(0, 3).map((item: any, index: number) => (
                                    <div key={item.id} className={`rounded-xl p-6 text-white ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                                            'bg-gradient-to-br from-orange-400 to-orange-500'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm opacity-90">#{item.rank}</span>
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-1">{item.name}</h3>
                                        <p className="text-sm opacity-90 mb-3">{item.category}</p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs opacity-75">Sold</p>
                                                <p className="text-lg font-bold">{item.quantitySold}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs opacity-75">Revenue</p>
                                                <p className="text-lg font-bold">{formatCurrency(item.revenue, currency.symbol)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Items by Quantity</h3>
                                <BarChart
                                    data={topItems.items.map((item: any) => ({
                                        label: item.name.substring(0, 15),
                                        value: item.quantitySold
                                    }))}
                                    height={300}
                                    color="#10B981"
                                />
                            </div>

                            {/* Full Table */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Complete List</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rank</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Qty Sold</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Orders</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {topItems.items.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">#{item.rank}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{item.quantitySold}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                        {formatCurrency(item.revenue, currency.symbol)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.orders}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Payment Method Analysis Tab */}
                <TabsContent value="payment" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Payment Method Analysis</h2>
                        {paymentAnalysis && (
                            <ExportButton
                                data={paymentAnalysis.methods}
                                filename={`payment-analysis-${paymentAnalysis.startDate}-${paymentAnalysis.endDate}`}
                            />
                        )}
                    </div>

                    {paymentAnalysis && (
                        <>
                            {/* Total Revenue Card */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
                                <p className="text-indigo-100 mb-2">Total Revenue</p>
                                <h3 className="text-4xl font-bold">{formatCurrency(paymentAnalysis.totalRevenue, currency.symbol)}</h3>
                                <p className="text-indigo-100 mt-2 text-sm">
                                    {paymentAnalysis.startDate} to {paymentAnalysis.endDate}
                                </p>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pie Chart */}
                                <div className="bg-white rounded-xl border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Distribution</h3>
                                    <div className="flex justify-center">
                                        <PieChart
                                            data={paymentAnalysis.methods.map((method: any) => ({
                                                label: method.method,
                                                value: method.revenue
                                            }))}
                                            size={250}
                                        />
                                    </div>
                                </div>

                                {/* Bar Chart */}
                                <div className="bg-white rounded-xl border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Payment Method</h3>
                                    <BarChart
                                        data={paymentAnalysis.methods.map((method: any) => ({
                                            label: method.method,
                                            value: method.revenue
                                        }))}
                                        height={300}
                                        valuePrefix={currency.symbol}
                                        color="#6366F1"
                                    />
                                </div>
                            </div>

                            {/* Payment Methods Table */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment Method</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Transactions</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% of Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paymentAnalysis.methods.map((method: any, index: number) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                                        {method.method}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                        {formatCurrency(method.revenue, currency.symbol)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{method.transactions}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {(method.percentage || 0).toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Profit & Loss Tab */}
                <TabsContent value="profitloss" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Report</h2>
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-lg"
                            defaultValue={new Date().getMonth() + 1}
                            onChange={(e) => {
                                const month = parseInt(e.target.value)
                                getProfitLossReport(month, new Date().getFullYear()).then(setProfitLoss)
                            }}
                        >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {profitLoss && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    title="Revenue"
                                    value={formatCurrency(profitLoss.revenue, currency.symbol)}
                                    icon={<DollarSign className="h-6 w-6" />}
                                    trend={profitLoss.growth > 0 ? 'up' : profitLoss.growth < 0 ? 'down' : 'neutral'}
                                    change={profitLoss.growth}
                                />
                                <StatCard
                                    title="Orders"
                                    value={profitLoss.orders}
                                    icon={<ShoppingCart className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Avg Order Value"
                                    value={formatCurrency(profitLoss.averageOrderValue, currency.symbol)}
                                    icon={<TrendingUp className="h-6 w-6" />}
                                />
                                <StatCard
                                    title="Previous Month"
                                    value={formatCurrency(profitLoss.previousMonthRevenue, currency.symbol)}
                                    subtitle="For comparison"
                                    icon={<Calendar className="h-6 w-6" />}
                                />
                            </div>

                            {/* P&L Summary */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">{profitLoss.month} Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                        <span className="text-gray-600">Total Revenue</span>
                                        <span className="text-xl font-bold text-green-600">
                                            {formatCurrency(profitLoss.revenue, currency.symbol)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                        <span className="text-gray-600">Total Orders</span>
                                        <span className="text-lg font-semibold text-gray-900">{profitLoss.orders}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                        <span className="text-gray-600">Average Order Value</span>
                                        <span className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(profitLoss.averageOrderValue, currency.symbol)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-gray-600">Growth vs Previous Month</span>
                                        <span className={`text-lg font-bold ${profitLoss.growth > 0 ? 'text-green-600' :
                                            profitLoss.growth < 0 ? 'text-red-600' :
                                                'text-gray-600'
                                            }`}>
                                            {profitLoss.growth > 0 ? '+' : ''}{(profitLoss.growth || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Growth Indicator */}
                            <div className={`rounded-xl p-6 text-white ${profitLoss.growth > 0 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                profitLoss.growth < 0 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                    'bg-gradient-to-br from-gray-500 to-gray-600'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="opacity-90 mb-2">Month-over-Month Growth</p>
                                        <h3 className="text-4xl font-bold">
                                            {profitLoss.growth > 0 ? '+' : ''}{(profitLoss.growth || 0).toFixed(1)}%
                                        </h3>
                                        <p className="opacity-90 mt-2 text-sm">
                                            {profitLoss.growth > 0 ? '📈 Revenue is growing!' :
                                                profitLoss.growth < 0 ? '📉 Revenue declined' :
                                                    '➡️ Revenue stable'}
                                        </p>
                                    </div>
                                    <TrendingUp className="h-16 w-16 opacity-50" />
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
