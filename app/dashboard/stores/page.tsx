import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import StoreManagementClient from "./store-client-impl"

export default async function StoresPage() {
    let user: any = null
    try {
        user = await getUserProfile()
        if (!user) redirect("/")
    } catch (error) {
        // Offline - show limited UI
        console.warn("StoresPage: Failed to get user (offline?)", error)
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Stores Management</h1>
            <p className="text-gray-500 mb-8">Manage your outlets and switch between stores</p>

            <StoreManagementClient user={user} />
        </div>
    )
}
