'use client'

import { useState, useEffect, useTransition } from "react"
import { Search, Filter, Shield, Plus, Clock, CheckCircle, XCircle, Laptop, RefreshCw, Eye, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { searchLicenses, extendTrialLicense, revokeLicense, revealLicenseKey } from "@/app/actions/license"
import { toast } from "sonner"

type License = {
    id: string
    key: string
    type: 'TRIAL' | 'ANNUAL' | 'PERPETUAL'
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PENDING'
    validUntil: Date | null
    maxDevices: number
    extendedCount: number
    createdAt: Date
    store: {
        name: string
        location: string | null
        users: { email: string, username: string }[]
    }
    devices: any[]
    maskedKey?: string | null
}

import { useRouter } from "next/navigation"

export function LicenseList({ initialLicenses }: { initialLicenses: License[] }) {
    const router = useRouter()
    const [licenses, setLicenses] = useState<License[]>(initialLicenses)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("all")

    const [isPending, startTransition] = useTransition()

    // Sync state with props when server re-renders (Critical for real-time updates)
    useEffect(() => {
        setLicenses(initialLicenses)
    }, [initialLicenses])

    // Filter licenses based on tab
    const filteredLicenses = licenses.filter(license => {
        const now = new Date()
        const isExpired = license.validUntil && new Date(license.validUntil) < now
        const isRevoked = license.status === 'REVOKED'
        const isActive = license.status === 'ACTIVE' && !isExpired

        switch (activeTab) {
            case 'active':
                return isActive
            case 'trial':
                return license.type === 'TRIAL'
            case 'revoked':
                return isRevoked || isExpired
            default:
                return true
        }
    })

    const handleSearch = (query: string) => {
        setSearchQuery(query)
        if (query.length >= 2) {
            startTransition(async () => {
                const results = await searchLicenses(query)
                setLicenses(results as License[])
            })
        } else if (query.length === 0) {
            setLicenses(initialLicenses)
        }
    }

    const handleExtendTrial = async (licenseId: string, days: number) => {
        const result = await extendTrialLicense(licenseId, days)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Trial extended by ${days} days`)
            // Refresh the list
            const results = await searchLicenses("")
            setLicenses(results as License[])
        }
    }

    const handleRevoke = async (licenseId: string) => {
        if (!confirm("Are you sure you want to revoke this license?")) return

        const result = await revokeLicense(licenseId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("License revoked")
            const results = await searchLicenses("")
            setLicenses(results as License[])
        }
    }

    const handleReveal = async (licenseId: string) => {
        const result = await revealLicenseKey(licenseId)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success && result.key) {
            // Copy to clipboard immediately
            try {
                await navigator.clipboard.writeText(result.key)
                toast.success("License key copied to clipboard! (" + result.key.substring(0, 8) + "...)")

                // Optionally show it in a dialog or alert if needed, but copy is usually enough
                // For now, let's also update the local state to show it temporarily if we wanted, 
                // but simpler is just to alert/toast it or update the specific license item in state to show the unmasked key

                setLicenses(prev => prev.map(l => l.id === licenseId ? { ...l, maskedKey: result.key } : l))

            } catch (e) {
                toast.error("Could not copy to clipboard. Key: " + result.key)
            }
        }
    }

    const getStatusBadge = (license: License) => {
        const now = new Date()
        const isExpired = license.validUntil && new Date(license.validUntil) < now

        if (license.status === 'REVOKED') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <XCircle className="h-3 w-3" /> Revoked
                </span>
            )
        }
        if (isExpired) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <Clock className="h-3 w-3" /> Expired
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3" /> Active
            </span>
        )
    }

    const getTypeBadge = (type: string) => {
        const colors = {
            PERPETUAL: 'bg-blue-100 text-blue-700',
            ANNUAL: 'bg-purple-100 text-purple-700',
            TRIAL: 'bg-orange-100 text-orange-700'
        }
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors[type as keyof typeof colors] || 'bg-gray-100')}>
                {type}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by store, email, or key..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {filteredLicenses.length} license{filteredLicenses.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Tabs & Actions */}
            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="trial">Trial</TabsTrigger>
                        <TabsTrigger value="revoked">Revoked</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button variant="outline" size="sm" onClick={() => { startTransition(() => { router.refresh() }) }} className="gap-2">
                    <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Store</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">License Key</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Devices</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Expires</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredLicenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        No licenses found
                                    </td>
                                </tr>
                            ) : (
                                filteredLicenses.map(license => (
                                    <tr key={license.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            <div className="font-medium">{license.store.name}</div>
                                            <div className="text-xs text-muted-foreground">{license.store.users[0]?.email || 'No owner'}</div>
                                        </td>
                                        <td className="p-4 align-middle font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>{license.maskedKey || (license.key.length > 20 ? "Legacy (Encrypted)" : license.key)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleReveal(license.id)}
                                                    title="Reveal & Copy"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">{getTypeBadge(license.type)}</td>
                                        <td className="p-4 align-middle">{getStatusBadge(license)}</td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-1">
                                                <Laptop className="h-3 w-3 text-muted-foreground" />
                                                {license.devices.length}/{license.maxDevices}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {license.type === 'PERPETUAL'
                                                ? <span className="text-muted-foreground">Never</span>
                                                : license.validUntil
                                                    ? new Date(license.validUntil).toLocaleDateString()
                                                    : 'N/A'}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                {license.type !== 'PERPETUAL' && license.status === 'ACTIVE' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleExtendTrial(license.id, 30)}
                                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        +30d
                                                    </Button>
                                                )}
                                                {license.status === 'ACTIVE' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRevoke(license.id)}
                                                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        Revoke
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
