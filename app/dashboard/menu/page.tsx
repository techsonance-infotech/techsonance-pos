import { checkModuleAccess } from "@/lib/access-control"
import { MenuManagementClient } from "./menu-client"

export default async function MenuPage() {
    await checkModuleAccess('menu')
    return <MenuManagementClient />
}
