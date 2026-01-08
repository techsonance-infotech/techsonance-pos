"use client"

// Force HMR Update
import { useState, useEffect } from "react"
import {
    Home, Printer, Users, Settings, Receipt, HeartHandshake, Phone, Mail, FileText, Key, Building2, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserProfile } from "@/app/actions/user"
import systemInfo from "@/config/system-info.json"
import SettingsLoading from "./loading"

type SettingCardProps = {
    icon: any
    title: string
    description: string
    colorClass: string
    iconBgClass: string
    href?: string
    comingSoon?: boolean
    onClick?: () => void
}

function SettingCard({ icon: Icon, title, description, colorClass, iconBgClass, href, comingSoon, onClick }: SettingCardProps) {
    const Component = href ? 'a' : 'button'

    return (
        <Component
            href={href}
            onClick={onClick}
            className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-orange-100 transition-all text-left h-full group"
        >
            <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                iconBgClass,
                colorClass
            )}>
                <Icon className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                {title}
            </h3>

            <p className="text-gray-500 text-sm leading-relaxed">
                {description}
            </p>
        </Component>
    )
}

export default function SettingsPage() {
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        getUserProfile()
            .then(user => {
                if (user) setUserRole(user.role)
            })
            .catch(error => {
                // Offline - show default settings without admin options
                console.warn("Settings page: Failed to get user profile (offline?)", error)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    if (isLoading) {
        return <SettingsLoading />
    }

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <span className="font-medium text-orange-600">More Options</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">More Options</h1>
                <p className="text-gray-500 mt-2 text-lg">Configure your POS system preferences and settings</p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SettingCard
                    icon={Building2}
                    title="Business Settings"
                    description="Logo, Name, Address"
                    colorClass="text-orange-600"
                    iconBgClass="bg-orange-50"
                    href="/dashboard/settings/business"
                />
                {userRole === 'SUPER_ADMIN' && (
                    <SettingCard
                        icon={Key}
                        title="License Management"
                        description="Generate and manage product keys"
                        colorClass="text-red-600"
                        iconBgClass="bg-red-50"
                        href="/dashboard/admin/licenses"
                    />
                )}

                {userRole === 'SUPER_ADMIN' && (
                    <SettingCard
                        icon={Users}
                        title="User Management"
                        description="Manage system users and IPs"
                        colorClass="text-indigo-600"
                        iconBgClass="bg-indigo-50"
                        href="/dashboard/admin/users"
                    />
                )}

                <SettingCard
                    icon={Receipt}
                    title="Tax Configuration"
                    description="Manage tax rates and settings"
                    colorClass="text-blue-600"
                    iconBgClass="bg-blue-50"
                    href="/dashboard/settings/taxes"
                />

                <SettingCard
                    icon={Printer}
                    title="Printer Settings"
                    description="Configure printer and auto-print"
                    colorClass="text-green-600"
                    iconBgClass="bg-green-50"
                    href="/dashboard/settings/printers"
                />

                <SettingCard
                    icon={Users}
                    title="Staff Management"
                    description="Manage staff and permissions"
                    colorClass="text-purple-600"
                    iconBgClass="bg-purple-50"
                    href="/dashboard/settings/staff"
                />

                <SettingCard
                    icon={Settings}
                    title="App Preferences"
                    description="Theme, currency, and formats"
                    colorClass="text-amber-600"
                    iconBgClass="bg-amber-50"
                    href="/dashboard/settings/preferences"
                />

                <SettingCard
                    icon={Info}
                    title="About"
                    description="Business details and support"
                    colorClass="text-cyan-600"
                    iconBgClass="bg-cyan-50"
                    href="/dashboard/settings/about"
                />
            </div>

            {/* System Information Panel */}
            <div className="mt-8 bg-gray-50/50 rounded-2xl border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-gray-800 mb-6">System Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Version</p>
                        <p className="font-semibold text-gray-900">{systemInfo.version}</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Last Updated</p>
                        <p className="font-semibold text-gray-900">{systemInfo.lastUpdated}</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">License</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-orange-500" /> {systemInfo.license}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Support</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" /> {systemInfo.support.email}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
