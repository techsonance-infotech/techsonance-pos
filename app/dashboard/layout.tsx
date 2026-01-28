import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SessionGuard } from "@/components/auth/session-guard"
import { getUserProfile } from "@/app/actions/user"
import { BootstrapProvider } from "@/components/providers/bootstrap-provider"
import { SyncProvider } from "@/components/providers/sync-provider"
import { verifySessionLicense } from "@/app/actions/license"
import { LicenseBlockedScreen } from "@/components/license/license-blocked-screen"
import { TrialBanner } from "@/components/license/trial-banner"

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUserProfile()

    if (!user) {
        const { redirect } = await import("next/navigation")
        redirect('/')
    }

    // Server-side license verification
    const licenseStatus = await verifySessionLicense(user.id)

    // If license is invalid, show blocked screen
    if (!licenseStatus.valid) {
        return (
            <SessionGuard>
                <LicenseBlockedScreen error={licenseStatus.error || "License required"} />
            </SessionGuard>
        )
    }

    // Fetch Business Settings for Sidebar (company-aware)
    const { getCompanyBusinessSettings } = await import("@/app/actions/settings")
    const companySettings = await getCompanyBusinessSettings()

    const businessName = companySettings.settings?.businessName || ''
    const logoUrl = companySettings.settings?.logoUrl || ''

    // Pass trial info to TrialBanner
    const trialInfo = licenseStatus.isTrial ? {
        isTrial: true,
        daysRemaining: licenseStatus.daysRemaining || 0
    } : null

    return (
        <SessionGuard>
            <BootstrapProvider>
                <SyncProvider>
                    <div className="flex h-screen w-full overflow-hidden bg-white flex-col">
                        {/* Trial Banner - Shows only for trial accounts */}
                        {trialInfo && (
                            <TrialBanner daysRemaining={trialInfo.daysRemaining} />
                        )}

                        <div className="flex flex-1 overflow-hidden">
                            <Sidebar
                                userRole={user?.role}
                                disabledModules={user?.disabledModules ? Array.from(user.disabledModules) : []}
                                businessName={businessName}
                                logoUrl={logoUrl}
                                storeTableMode={user?.defaultStore?.tableMode}
                            />
                            <div className="flex flex-1 flex-col h-full min-w-0">
                                {/* Sanitize user object to remove symbols (e.g. from Prisma extensions) before passing to Client Component */}
                                <Header initialUser={user ? JSON.parse(JSON.stringify(user)) : null} />
                                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                    {children}
                                </main>
                            </div>
                        </div>
                    </div>
                </SyncProvider>
            </BootstrapProvider>
        </SessionGuard>
    )
}
