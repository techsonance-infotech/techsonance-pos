"use client"

import { useState } from "react"
import { activateLicense } from "@/app/actions/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, AlertTriangle, Loader2, CheckCircle, Crown } from "lucide-react"
import { toast } from "sonner"
import { PlanSelectionModal } from "@/components/license/plan-selection-modal"

export function LicenseBlockedScreen({ error }: { error: string }) {
    const [activating, setActivating] = useState(false)
    const [licenseKey, setLicenseKey] = useState("")
    const [showKeyInput, setShowKeyInput] = useState(false)

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
            window.location.reload()
        }
        setActivating(false)
    }

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
                        <p className="text-gray-500 mt-2">{error}</p>
                    </div>

                    {/* Alert */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">Access Blocked</p>
                            <p className="text-amber-700 mt-1">
                                Purchase a license or enter your product key to continue.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        {/* Purchase License Button */}
                        <PlanSelectionModal
                            trigger={
                                <Button className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg shadow-lg">
                                    <Crown className="h-5 w-5 mr-2" />
                                    Purchase License
                                </Button>
                            }
                        />

                        {/* Already have a key toggle */}
                        <div className="text-center">
                            <button
                                onClick={() => setShowKeyInput(!showKeyInput)}
                                className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
                            >
                                Already have a license key?
                            </button>
                        </div>

                        {/* Key Input (toggled) */}
                        {showKeyInput && (
                            <form onSubmit={handleActivate} className="space-y-3 pt-2 border-t border-gray-100">
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
                                    className="w-full h-12 bg-gray-900 hover:bg-gray-800"
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
                        )}
                    </div>

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
