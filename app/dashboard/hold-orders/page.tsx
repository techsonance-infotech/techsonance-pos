import { checkModuleAccess } from "@/lib/access-control"
import { HoldOrdersClient } from "./hold-orders-client"

export default async function HoldOrdersPage() {
    await checkModuleAccess('orders')
    return <HoldOrdersClient />
}
