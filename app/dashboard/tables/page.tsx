import { getTables } from "@/app/actions/tables"
import TablesClient from "./tables-client"

export default async function TablesPage() {
    const tables = await getTables()

    return <TablesClient initialTables={tables} />
}
