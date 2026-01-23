"use client"

import { useEffect, useState } from "react"
import { getMyLicenseStatus, activateLicense } from "@/app/actions/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, AlertTriangle, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

type LicenseStatus = {
    valid: boolean
    error?: string
    isTrial?: boolean
    daysRemaining?: number
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<LicenseStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [activating, setActivating] = useState(false)
    const [licenseKey, setLicenseKey] = useState("")

    useEffect(() => {
        checkLicense()
    }, [])

    async function checkLicense() {
        setLoading(true)
        const result = await getMyLicenseStatus()
        setStatus(result as LicenseStatus)
        setLoading(false)
    }

    async function handleActivate(e: React.FormEvent) {
        e.preventDefault()
        if (!licenseKey.trim()) {
            toast.error("Please enter a license key")
            return
        }

        setActivating(true)
        const result = await activateLicense(licenseKey.trim().toUpperCase())

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message || "License activated!")
            // Refresh the page to apply new license status
            window.location.reload()
        }
        setActivating(false)
    }

    // Still loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-white">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-500">Verifying license...</p>
                </div>
            </div>
        )
    }

    // License is valid - render children
    if (status?.valid) {
        return <>{children}</>
    }

    // License is NOT valid - show activation screen
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
            <div className="w-full max-w-md p-8">
                <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 p-8 space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="h-20 w-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Key className="h-10 w-10 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">License Required</h1>
                        <p className="text-gray-500 mt-2">
                            {status?.error || "Please activate your license to continue."}
                        </p>
                    </div>

                    {/* Alert */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">Access Blocked</p>
                            <p className="text-amber-700 mt-1">
                                Enter your product key below to activate your license. Contact your administrator if you don't have a key.
                            </p>
                        </div>
                    </div>

                    {/* Activation Form */}
                    <form onSubmit={handleActivate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Key
                            </label>
                            <Input
                                type="text"
                                placeholder="XXXXX-XXXXX-XXXXX"
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                className="h-14 text-center text-lg font-mono tracking-wider uppercase"
                                maxLength={17}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={activating || !licenseKey.trim()}
                            className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg shadow-lg"
                        >
                            {activating ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Activating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Activate License
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Support Link */}
                    <p className="text-center text-sm text-gray-400">
                        Need help? Contact{" "}
                        <a href="mailto:info@techsonance.co.in" className="text-orange-600 hover:underline">
                            support@techsonance.co.in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
