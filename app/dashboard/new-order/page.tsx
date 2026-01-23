import { checkModuleAccess } from "@/lib/access-control"
import { NewOrderClient } from "./new-order-client"

export default async function NewOrderPage() {
    await checkModuleAccess('orders')
    return <NewOrderClient />
}
