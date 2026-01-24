import { getCustomers } from "@/app/actions/crm"
import { CustomerClient } from "./customer-client"

export default async function CustomersPage() {
    // Initial Hydration
    const res = await getCustomers()
    const customers = res.customers || []

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Customer Loyalty</h2>
                <p className="text-muted-foreground">Manage relationships and points.</p>
            </div>

            <CustomerClient initialCustomers={customers} />
        </div>
    )
}
