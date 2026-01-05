import { getBusinessSettings } from "@/app/actions/settings"
import { SettingsForm } from "./settings-form"
import { Building2, Home, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function BusinessSettingsPage() {
    const settings = await getBusinessSettings()

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
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
                <span className="font-medium text-orange-600">Business Settings</span>
            </div>

            <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-orange-600" />
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Business Settings</h2>
            </div>
            <p className="text-gray-500">
                Manage your business details, logo, and contact information. These details will be visible on receipts and the application interface.
            </p>

            <div className="max-w-2xl">
                <SettingsForm initialSettings={settings} />
            </div>
        </div>
    )
}
