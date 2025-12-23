import { getBusinessSettings } from "@/app/actions/settings"
import { SettingsForm } from "./settings-form"
import { Building2 } from "lucide-react"

export default async function BusinessSettingsPage() {
    const settings = await getBusinessSettings()

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
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
