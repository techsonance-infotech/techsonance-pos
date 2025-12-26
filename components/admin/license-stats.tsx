'use client'

import { Shield, CheckCircle, XCircle, Cpu } from "lucide-react"

interface LicenseStatsProps {
    total: number
    active: number
    expired: number
    totalDevices: number
}

export function LicenseStats({ total, active, expired, totalDevices }: LicenseStatsProps) {
    const stats = [
        {
            label: "Total Licenses",
            value: total,
            icon: Shield,
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-50",
            textColor: "text-blue-600"
        },
        {
            label: "Active Licenses",
            value: active,
            icon: CheckCircle,
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-50",
            textColor: "text-green-600"
        },
        {
            label: "Expired/Revoked",
            value: expired,
            icon: XCircle,
            color: "from-red-500 to-red-600",
            bgColor: "bg-red-50",
            textColor: "text-red-600"
        },
        {
            label: "Total Devices",
            value: totalDevices,
            icon: Cpu,
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-50",
            textColor: "text-purple-600"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <div
                        key={index}
                        className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                    >
                        {/* Gradient background */}
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-8 -mt-8`}></div>

                        {/* Icon */}
                        <div className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                            <Icon className={`h-6 w-6 ${stat.textColor}`} />
                        </div>

                        {/* Content */}
                        <div className="relative">
                            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${stat.textColor}`}>
                                {stat.value}
                            </p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
