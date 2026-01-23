"use client"

import { useState } from "react"
import { createLicenseRequest, getMyLicenseRequest } from "@/app/actions/license-request"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Crown, Check, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Define plans locally to avoid server-action import issues
const LICENSE_PLANS = {
    ANNUAL: { type: 'ANNUAL', price: 4999, label: 'Annual License', description: '1 Year Access' },
    PERPETUAL: { type: 'PERPETUAL', price: 9999, label: 'Perpetual License', description: 'Lifetime Access' }
}

export function PlanSelectionModal({ trigger }: { trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)
    const router = useRouter()

    // Check if there's an existing request when trying to open modal
    const handleOpenChange = async (shouldOpen: boolean) => {
        if (shouldOpen) {
            setChecking(true)
            const existingRequest = await getMyLicenseRequest()
            setChecking(false)

            if (existingRequest) {
                // Redirect to existing chat instead of showing popup
                toast.info("You have an active license request. Redirecting to chat...")
                router.push('/dashboard/license-chat')
                return
            }
        }
        setOpen(shouldOpen)
    }

    const handleSelectPlan = async (planType: string) => {
        setLoading(planType)
        const result = await createLicenseRequest(planType)

        if (result.error) {
            if (result.existingId) {
                toast.info("You already have an active request. Opening chat...")
                router.push('/dashboard/license-chat')
            } else {
                toast.error(result.error)
            }
        } else if (result.success) {
            toast.success("License request submitted! Opening chat...")
            router.push('/dashboard/license-chat')
        }

        setLoading(null)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        disabled={checking}
                    >
                        {checking ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Crown className="h-4 w-4 mr-2" />
                        )}
                        Get License
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                        <Sparkles className="h-6 w-6 text-orange-500" />
                        Choose Your Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 mt-4">
                    {/* Annual Plan */}
                    <div
                        className="relative overflow-hidden rounded-2xl border-2 border-gray-200 p-6 hover:border-orange-400 transition-all cursor-pointer group"
                        onClick={() => !loading && handleSelectPlan('ANNUAL')}
                    >
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                            POPULAR
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{LICENSE_PLANS.ANNUAL.label}</h3>
                                <p className="text-gray-500">{LICENSE_PLANS.ANNUAL.description}</p>
                                <ul className="mt-4 space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Full access to all features
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Priority support
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Free updates for 1 year
                                    </li>
                                </ul>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-orange-600">
                                    ₹{LICENSE_PLANS.ANNUAL.price.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">/year</div>
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 group-hover:from-orange-600 group-hover:to-orange-700"
                            disabled={!!loading}
                        >
                            {loading === 'ANNUAL' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Select Annual Plan
                        </Button>
                    </div>

                    {/* Perpetual Plan */}
                    <div
                        className="relative overflow-hidden rounded-2xl border-2 border-gray-200 p-6 hover:border-purple-400 transition-all cursor-pointer group bg-gradient-to-br from-purple-50 to-white"
                        onClick={() => !loading && handleSelectPlan('PERPETUAL')}
                    >
                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                            BEST VALUE
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{LICENSE_PLANS.PERPETUAL.label}</h3>
                                <p className="text-gray-500">{LICENSE_PLANS.PERPETUAL.description}</p>
                                <ul className="mt-4 space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Full access to all features
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Priority support forever
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Lifetime updates
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Never pay again
                                    </li>
                                </ul>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-purple-600">
                                    ₹{LICENSE_PLANS.PERPETUAL.price.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">one-time</div>
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600 group-hover:from-purple-600 group-hover:to-purple-700"
                            disabled={!!loading}
                        >
                            {loading === 'PERPETUAL' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Select Perpetual Plan
                        </Button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                    After selecting a plan, our team will contact you with payment details.
                </p>
            </DialogContent>
        </Dialog>
    )
}
