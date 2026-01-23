import { getAllLicenses, getAllCompaniesForLicensing, getLicenseStats } from "@/app/actions/license"
import { LicenseForm } from "@/components/admin/license-form"
import { LicenseStats } from "@/components/admin/license-stats"
import { LicenseList } from "@/components/admin/license-list"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { Shield, Home, ChevronRight, Key, Building } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function AdminLicensesPage() {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') {
        redirect('/dashboard')
    }

    const [licenses, companies, stats] = await Promise.all([
        getAllLicenses(),
        getAllCompaniesForLicensing(),
        getLicenseStats()
    ])

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
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                        <Key className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">License Management</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {companies.length} Companies registered
                        </p>
                    </div>
                </div>
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
                    <LicenseForm companies={companies} />
                </div>

                {/* License List with Search and Tabs */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="h-5 w-5 text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900">All Licenses</h2>
                        </div>
                        <LicenseList initialLicenses={licenses as any} />
                    </div>
                </div>
            </div>
        </div>
    )
}

