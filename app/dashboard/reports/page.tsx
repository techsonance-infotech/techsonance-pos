import { getSalesReport, getItemSalesReport } from "@/app/actions/reports"
import { ReportsClient } from "./reports-client"
import { getUserProfile } from "@/app/actions/user"

export default async function ReportsPage() {
    const user = await getUserProfile()

    // Default to today
    const salesData = await getSalesReport()
    const itemData = await getItemSalesReport()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            </div>

            <ReportsClient
                initialSales={salesData}
                initialItems={itemData}
                storeId={user?.defaultStoreId || ''}
            />
        </div>
    )
}
