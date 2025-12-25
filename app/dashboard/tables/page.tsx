import { getTables } from "@/app/actions/tables"
import { getUserProfile } from "@/app/actions/user"
import TablesClient from "./tables-client"

export default async function TablesPage() {
    const [user, tables] = await Promise.all([
        getUserProfile(),
        getTables()
    ])

    return <TablesClient initialTables={tables} user={user} />
}
