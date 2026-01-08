import { getBusinessSettings, getCompanyBusinessSettings } from "@/app/actions/settings"
import { SettingsForm } from "./settings-form"
import { Building2, Home, ChevronRight, Building } from "lucide-react"
import Link from "next/link"

export default async function BusinessSettingsPage() {
    let settings: any = {}
    let hasCompany = false

    try {
        // First try to get company-specific settings
        const companyData = await getCompanyBusinessSettings()
        hasCompany = companyData.hasCompany

        if (companyData.settings) {
            settings = companyData.settings
        } else {
            // Fallback to global settings
            settings = await getBusinessSettings()
        }
    } catch (error) {
        // Server action failed - likely offline. Client form will handle with defaults.
        console.warn("BusinessSettingsPage: Failed to fetch settings (offline?)", error)
    }

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

            {hasCompany ? (
                <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-4 py-3 rounded-xl border border-teal-200">
                    <Building className="h-4 w-4" />
                    <span>You are editing your company profile: <strong>{settings.businessName}</strong></span>
                </div>
            ) : (
                <p className="text-gray-500">
                    Manage your business details, logo, and contact information. These details will be visible on receipts and the application interface.
                </p>
            )}

            <div className="max-w-2xl">
                <SettingsForm initialSettings={settings} hasCompany={hasCompany} />
            </div>
        </div>
    )
}
