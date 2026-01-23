import { getTablesWithHeldOrders } from "@/app/actions/tables"
import { getUserProfile } from "@/app/actions/user"
import { checkModuleAccess } from "@/lib/access-control"
import TablesClient from "./tables-client"

export default async function TablesPage() {
    await checkModuleAccess('tables')
    let tables: any[] = []
    try {
        tables = await getTablesWithHeldOrders()
    } catch (error) {
        // Server action failed - likely offline. Client will use local cache.
        console.warn("TablesPage: Failed to fetch tables (offline?)", error)
    }

    const user = await getUserProfile()
    return <TablesClient initialTables={tables} userRole={user?.role} />
}
