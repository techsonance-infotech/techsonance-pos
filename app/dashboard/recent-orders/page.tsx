import { checkModuleAccess } from "@/lib/access-control"
import { RecentOrdersClient } from "./recent-orders-client"

export default async function RecentOrdersPage() {
    await checkModuleAccess('orders')
    return <RecentOrdersClient />
}
