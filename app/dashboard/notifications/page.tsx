import { checkModuleAccess } from "@/lib/access-control"
import { NotificationsClient } from "./notifications-client"

export default async function NotificationsPage() {
    await checkModuleAccess('notifications')
    return <NotificationsClient />
}
