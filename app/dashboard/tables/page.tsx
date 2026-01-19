import { getTablesWithHeldOrders } from "@/app/actions/tables"
import TablesClient from "./tables-client"

export default async function TablesPage() {
    let tables: any[] = []
    try {
        tables = await getTablesWithHeldOrders()
    } catch (error) {
        // Server action failed - likely offline. Client will use local cache.
        console.warn("TablesPage: Failed to fetch tables (offline?)", error)
    }

    return <TablesClient initialTables={tables} />
}
