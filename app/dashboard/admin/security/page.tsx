
import { getSecurityStatus } from "@/app/actions/security"
import { getUserProfile } from "@/app/actions/user"
import { SecurityControls } from "@/components/admin/security-controls"
import { redirect } from "next/navigation"

export default async function SecurityPage() {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

    const status = await getSecurityStatus()
    // IP Address fetching for display:
    const { headers } = await import("next/headers")
    const headerList = await headers()
    const currentIp = headerList.get("x-forwarded-for") || "127.0.0.1"

    if (!status) return <div>Error loading security status</div>

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Security Command Center</h1>
                <p className="text-muted-foreground">Manage system-wide access, firewalls, and user restrictions.</p>
            </div>

            <SecurityControls
                initialRules={status.rules}
                maintenanceMode={status.maintenanceMode}
                lockedCount={status.lockedUserCount}
                currentIp={currentIp}
            />
        </div>
    )
}
