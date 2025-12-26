'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, User, Calendar, Cpu, Copy, Check } from "lucide-react"
import { LicenseActions } from "./license-actions"
import { useState } from "react"
import { toast } from "sonner"

interface LicenseCardProps {
    license: {
        id: string
        key: string
        type: 'TRIAL' | 'ANNUAL' | 'PERPETUAL'
        status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
        validUntil: Date | null
        maxDevices: number
        store: {
            name: string
            location: string | null
            users: Array<{
                email: string
                username: string
            }>
        }
        devices: Array<any> | null
    }
}

export function LicenseCard({ license }: LicenseCardProps) {
    const [copied, setCopied] = useState(false)
    const owner = license.store.users[0]
    const deviceCount = license.devices?.length || 0
    const devicePercentage = (deviceCount / license.maxDevices) * 100

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(license.key)
            setCopied(true)
            toast.success("License key copied to clipboard!")
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error("Failed to copy license key")
        }
    }

    // Status colors
    const statusColors = {
        ACTIVE: "bg-green-500",
        REVOKED: "bg-red-500",
        EXPIRED: "bg-orange-500"
    }

    const typeColors = {
        PERPETUAL: "bg-blue-100 text-blue-700 border-blue-200",
        ANNUAL: "bg-orange-100 text-orange-700 border-orange-200",
        TRIAL: "bg-purple-100 text-purple-700 border-purple-200"
    }

    return (
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg">
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${statusColors[license.status]}`}></div>

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-lg">{license.store.name}</h3>
                    </div>
                    {license.store.location && (
                        <p className="text-sm text-gray-500">{license.store.location}</p>
                    )}
                </div>
                <Badge className={`${typeColors[license.type]} border`}>
                    {license.type}
                </Badge>
            </div>

            {/* Owner Info */}
            {owner && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{owner.email}</p>
                        <p className="text-xs text-gray-500">@{owner.username}</p>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Expiry */}
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className="text-sm font-medium">
                            {license.validUntil ? new Date(license.validUntil).toLocaleDateString() : 'Never'}
                        </p>
                    </div>
                </div>

                {/* Devices */}
                <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-gray-400" />
                    <div>
                        <p className="text-xs text-gray-500">Devices</p>
                        <p className="text-sm font-medium">
                            {deviceCount} / {license.maxDevices}
                        </p>
                    </div>
                </div>
            </div>

            {/* Device Usage Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Device Usage</span>
                    <span>{Math.round(devicePercentage)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${devicePercentage >= 90 ? 'bg-red-500' :
                            devicePercentage >= 70 ? 'bg-orange-500' :
                                'bg-green-500'
                            }`}
                        style={{ width: `${devicePercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* License Key */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-500">License Key</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-6 px-2"
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                </div>
                <code className="text-xs font-mono text-gray-600 break-all line-clamp-2">
                    {license.key}
                </code>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Badge variant={license.status === 'ACTIVE' ? 'default' : 'destructive'}>
                    {license.status}
                </Badge>
                <LicenseActions
                    licenseId={license.id}
                    isPerpetual={license.type === 'PERPETUAL'}
                    status={license.status}
                />
            </div>
        </div>
    )
}
