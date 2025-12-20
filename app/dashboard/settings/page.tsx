"use client"

import { useState, useEffect } from "react"
import {
    Home, Printer, Users, Settings, Receipt, HeartHandshake, Phone, Mail, FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserProfile } from "@/app/actions/user"

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
            </div>

            {/* System Information Panel */}
            <div className="mt-8 bg-gray-50/50 rounded-2xl border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-gray-800 mb-6">System Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Version</p>
                        <p className="font-semibold text-gray-900">1.0.0</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Last Updated</p>
                        <p className="font-semibold text-gray-900">December 17, 2025</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">License</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-orange-500" /> Professional
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Support</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" /> support@cafepos.com
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
