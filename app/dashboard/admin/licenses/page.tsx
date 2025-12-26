import { getAllLicenses, getAllStoresForLicensing, getLicenseStats } from "@/app/actions/license"
import { LicenseForm } from "@/components/admin/license-form"
import { LicenseCard } from "@/components/admin/license-card"
import { LicenseStats } from "@/components/admin/license-stats"
import { MultiAccountActivation } from "@/components/admin/multi-account-activation"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { Shield, Search, Home, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default async function AdminLicensesPage() {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') {
        redirect('/dashboard')
    }

    const licenses = await getAllLicenses()
    const availableStores = await getAllStoresForLicensing()
    const stats = await getLicenseStats()

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">
                    More Options
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">License Management</span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">License Management</h1>
                        <p className="text-muted-foreground">Generate and manage software licenses for stores</p>
                    </div>
                </div>
                <MultiAccountActivation stores={availableStores} />
            </div>

            {/* Stats Dashboard */}
            <LicenseStats
                total={stats.total}
                active={stats.active}
                expired={stats.expired}
                totalDevices={stats.totalDevices}
            />

            {/* Main Content */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* License Form */}
                <div className="lg:col-span-1">
                    <LicenseForm stores={availableStores} />
                </div>

                {/* License Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Active Licenses ({licenses.length})</h3>
                        {/* Search - Future enhancement */}
                        {/* <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search licenses..." className="pl-9" />
                        </div> */}
                    </div>

                    {licenses.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed bg-gray-50 p-12 text-center">
                            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No licenses issued yet</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Get started by generating a license for a store
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
                            {licenses.map(license => (
                                <LicenseCard key={license.id} license={license} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
