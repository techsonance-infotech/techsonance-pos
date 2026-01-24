import { getActiveKitchenOrders } from "@/app/actions/kds"
import { KDSBoard } from "./kds-board"
import { getUserProfile } from "@/app/actions/user"

export default async function KDSPage() {
    // Initial fetch to populate board quickly
    const res = await getActiveKitchenOrders()
    const initialOrders = res.orders || []

    return (
        <div className="flex-1 h-[calc(100vh-4rem)] p-4 flex flex-col bg-slate-900 text-white overflow-hidden">
            {/* Dark Mode default for Kitchen View */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Kitchen Display System</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-slate-400">LIVE FEED</span>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
            </div>

            <KDSBoard initialOrders={initialOrders} />
        </div>
    )
}
