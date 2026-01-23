import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"

export async function checkModuleAccess(moduleId: string) {
    const user = await getUserProfile()

    // Super Admin has access to everything
    if (user?.role === 'SUPER_ADMIN') return

    // Business Owner has access to everything
    if (user?.role === 'BUSINESS_OWNER') return

    // Manager has access to everything requested
    if (user?.role === 'MANAGER') return

    if (user?.disabledModules?.includes(moduleId)) {
        redirect('/dashboard')
    }
}
