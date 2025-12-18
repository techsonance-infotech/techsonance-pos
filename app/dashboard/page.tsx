import { Button } from "@/components/ui/button"
import { IndianRupee, ShoppingBag, Clock, Pause, Plus, List, Settings } from "lucide-react"

export default function DashboardPage() {
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
                    value="₹0.00"
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatsCard
                    icon={ShoppingBag}
                    label="Total Orders"
                    value="0"
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatsCard
                    icon={Clock}
                    label="Active Orders"
                    value="0"
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
                <StatsCard
                    icon={Pause}
                    label="Hold Orders"
                    value="0"
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Quick Actions */}
                <div className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Quick Actions</h2>
                    <div className="space-y-4">
                        <Button className="w-full h-14 justify-start text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-orange-200 shadow-lg border-none">
                            <Plus className="mr-3 h-6 w-6" /> Create New Order
                        </Button>
                        <Button className="w-full h-14 justify-start text-lg bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-100 shadow-sm hover:shadow">
                            <Pause className="mr-3 h-6 w-6 text-purple-600" /> View Hold Orders (0)
                        </Button>
                        <Button className="w-full h-14 justify-start text-lg bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-100 shadow-sm hover:shadow">
                            <Settings className="mr-3 h-6 w-6 text-blue-600" /> Manage Menu
                        </Button>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
                        <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium">View All</Button>
                    </div>

                    <div className="flex h-[200px] flex-col items-center justify-center text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <div className="rounded-full bg-white p-4 mb-3 shadow-sm">
                            <List className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-medium">No orders today yet</p>
                    </div>
                </div>
            </div>
        </div>
    )
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
