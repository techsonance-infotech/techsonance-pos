import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SessionGuard } from "@/components/auth/session-guard"
import { getUserProfile } from "@/app/actions/user"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUserProfile()

    // --- SECURITY CHECKS ---
    const { headers } = await import("next/headers")
    const headerList = await headers()
    const ip = headerList.get("x-forwarded-for") || "unknown"

    const { getSecurityStatus } = await import("@/app/actions/security")
    // Note: getSecurityStatus currently returns ALL rules, which isn't efficient for production with thousands of rules,
    // but for this "absolute power" demo it works. In prod, use `db.securityRule.findUnique`.
    // Let's do a direct optimized check here for performance:
    const { prisma } = await import("@/lib/prisma")

    // 1. IP Check (Disabled - securityRule table not in schema)
    // const ipBan = await prisma.securityRule.findUnique({
    //     where: { value: ip, type: 'IP' }
    // })
    // if (ipBan) {
    //     return <div className="h-screen flex items-center justify-center text-red-600 font-bold">Access Denied: IP Blocked</div>
    // }

    // 2. Maintenance Mode (Disabled - systemConfig table not in schema)
    // const maintenanceConfig = await prisma.systemConfig.findUnique({ where: { key: "maintenance_mode" } })
    // if (maintenanceConfig?.isEnabled) {
    //     // Allow Super Admin to bypass
    //     if (user?.role !== 'SUPER_ADMIN') {
    //         const { redirect } = await import("next/navigation")
    //         redirect('/maintenance')
    //     }
    // }

    // 3. User Lock (Disabled - isLocked not in schema)
    // if (user?.isLocked) {
    //     return <div className="h-screen flex items-center justify-center text-red-600 font-bold">Account Locked. Contact Support.</div>
    // }
    // -----------------------

    if (!user) {
        const { redirect } = await import("next/navigation")
        redirect('/')
    }

    // Verify License
    const { verifySessionLicense } = await import("@/app/actions/license")
    const licenseCheck = await verifySessionLicense(user!.id)

    if (!licenseCheck.valid) {
        // We need to import redirect dynamically or use next/navigation
        const { redirect } = await import("next/navigation")
        redirect('/license/expired')
    }

    // Fetch Business Settings for Sidebar
    const { getBusinessSettings } = await import("@/app/actions/settings")
    const businessSettings = await getBusinessSettings()

    return (
        <SessionGuard>
            <div className="flex h-screen w-full overflow-hidden bg-white">
                <Sidebar
                    userRole={user?.role}
                    businessName={businessSettings.businessName}
                    logoUrl={businessSettings.logoUrl}
                />
                <div className="flex flex-1 flex-col h-full min-w-0">
                    <Header initialUser={user} />
                    <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                        {children}
                    </main>
                </div>
            </div>
        </SessionGuard>
    )
}
