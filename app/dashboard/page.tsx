import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IndianRupee, ShoppingBag, Clock, Pause, Plus, List, Settings, ChevronRight } from "lucide-react"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { getDashboardStats, getRecentOrders } from "@/app/actions/dashboard"
import { Badge } from "@/components/ui/badge"
import { getCurrency } from "@/app/actions/preferences"
import { formatCurrency } from "@/lib/format"

export default async function DashboardPage() {
    const user = await getUserProfile()
    if (!user) redirect("/")
    if (!user.defaultStoreId) redirect("/dashboard/stores")
    // Note: We might want to pass the store name to UI if needed, but not required yet.

    const stats = await getDashboardStats(user.defaultStoreId)
    const recentOrders = await getRecentOrders(user.defaultStoreId)
    const { symbol } = await getCurrency()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
                <p className="text-gray-500 mt-1 font-medium">Welcome back! Here's your business overview.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    icon={IndianRupee}
                    label="Today's Sales"
                    value={formatCurrency(stats.todaySales, symbol)}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatsCard
                    icon={ShoppingBag}
                    label="Today's Orders"
                    value={stats.totalOrders.toString()}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatsCard
                    icon={Clock}
                    label="Active Tables"
                    value={stats.activeOrders.toString()}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
                <StatsCard
                    icon={Pause}
                    label="Hold Orders"
                    value={stats.holdOrders.toString()}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Quick Actions */}
                <div className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Quick Actions</h2>
                    <div className="space-y-4">
                        <Link href={(user.defaultStore as any)?.tableMode ? "/dashboard/tables" : "/dashboard/new-order"}>
                            <Button className="w-full h-14 justify-start text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-orange-200 shadow-lg border-none mb-4">
                                <Plus className="mr-3 h-6 w-6" /> Create New Order
                            </Button>
                        </Link>

                        <Link href="/dashboard/hold-orders">
                            <Button className="w-full h-14 justify-start text-lg bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-100 shadow-sm hover:shadow mb-4">
                                <Pause className="mr-3 h-6 w-6 text-purple-600" /> View Hold Orders ({stats.holdOrders})
                            </Button>
                        </Link>

                        {(user.role === 'BUSINESS_OWNER' || user.role === 'SUPER_ADMIN') && (
                            <Link href="/dashboard/menu">
                                <Button className="w-full h-14 justify-start text-lg bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-100 shadow-sm hover:shadow">
                                    <Settings className="mr-3 h-6 w-6 text-blue-600" /> Manage Menu
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
                        {/* Could add a link to full Order History page later */}
                        {recentOrders.length > 0 && (
                            <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium">View All</Button>
                        )}
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="flex h-[200px] flex-col items-center justify-center text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <div className="rounded-full bg-white p-4 mb-3 shadow-sm">
                                <List className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="font-medium">No orders today yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm text-lg font-bold text-gray-700">
                                            {order.type === 'DINE_IN' ? '🍽️' : '🛍️'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{order.customerName}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>#{order.kotNo}</span>
                                                <span>•</span>
                                                <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className={getBadgeStyles(order.status)}>
                                            {order.status}
                                        </Badge>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount, symbol)}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function getBadgeStyles(status: string) {
    switch (status) {
        case 'COMPLETED':
            return 'bg-green-100 text-green-700 border-green-200'
        case 'HELD':
            return 'bg-amber-100 text-amber-700 border-amber-200'
        case 'CANCELLED':
            return 'bg-red-100 text-red-700 border-red-200'
        default:
            return ''
    }
}

function StatsCard({
    icon: Icon,
    label,
    value,
    color,
    bg
}: {
    icon: any,
    label: string,
    value: string,
    color: string,
    bg: string
}) {
    return (
        <div className="group rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-transparent hover:border-gray-50 cursor-pointer">
            <div className={`inline-flex rounded-xl p-3 ${bg} ${color} mb-4 transition-transform group-hover:scale-110 duration-300`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
                <h3 className="text-3xl font-extrabold text-gray-800">{value}</h3>
                <p className="text-sm font-medium text-gray-500">{label}</p>
            </div>
        </div>
    )
}
