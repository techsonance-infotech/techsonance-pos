'use client'

import { createLicense } from "@/app/actions/license"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Copy, Check, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export function LicenseForm({ stores }: {
    stores: {
        id: string,
        name: string,
        location: string | null,
        users: { email: string, username: string }[],
        license: {
            id: string,
            type: 'TRIAL' | 'ANNUAL' | 'PERPETUAL',
            status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PENDING',
            validUntil: Date | null
        } | null
    }[]
}) {
    const [copied, setCopied] = useState(false)

    const router = useRouter()

    // Basic form state handling
    const [state, action, isPending] = useActionState(async (prev: any, formData: FormData) => {
        const result = await createLicense(formData)
        if (result.error) {
            toast.error(result.error)
            return { error: result.error }
        }
        if (result.success) {
            toast.success("License created successfully!")
            // Trigger server re-fetch so the list updates
            router.refresh()
            return { success: true, key: result.key }
        }
        return prev
    }, null)

    const [type, setType] = useState("PERPETUAL")

    const copyToClipboard = async () => {
        if (!state?.key) return

        try {
            await navigator.clipboard.writeText(state.key)
            setCopied(true)
            toast.success("License key copied to clipboard!")
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error("Failed to copy license key")
        }
    }

    return (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
            {/* Header with gradient */}
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Generate New License</h3>
                </div>
                <p className="text-sm text-orange-100 mt-1">Create a license key for a store</p>
            </div>

            <form action={action} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="storeId">Select Store</Label>
                    <Select name="storeId" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map(store => {
                                const owner = store.users[0]
                                const hasLicense = !!store.license
                                const isExpired = store.license?.validUntil && new Date(store.license.validUntil) < new Date()
                                const isRevoked = store.license?.status === 'REVOKED'

                                let statusBadge = ''
                                if (hasLicense && store.license) {
                                    if (isRevoked) statusBadge = '🔴 Revoked'
                                    else if (isExpired) statusBadge = '🟠 Expired'
                                    else statusBadge = `🔵 ${store.license.type}`
                                } else {
                                    statusBadge = '✅ No License'
                                }

                                // Requirement: Show User Email (Owner)
                                const label = owner
                                    ? `${store.name} (${owner.email}) - ${statusBadge}`
                                    : `${store.name} (No Owner) - ${statusBadge}`

                                return (
                                    <SelectItem key={store.id} value={store.id}>
                                        {label}
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">License Type</Label>
                    <Select name="type" value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PERPETUAL">🔵 Perpetual (Lifetime)</SelectItem>
                            <SelectItem value="ANNUAL">🟠 Annual</SelectItem>
                            <SelectItem value="TRIAL">🟣 Trial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {type !== 'PERPETUAL' && (
                    <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input type="date" name="expiryDate" required />
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                    {isPending ? "Generating..." : "Generate License"}
                </Button>
            </form>

            {state?.success && state.key && (
                <div className="mt-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 p-4 border-2 border-green-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            License Generated Successfully!
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyToClipboard}
                            className="h-8 text-green-700 hover:text-green-800 hover:bg-green-100"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                    <code className="block mt-2 break-all rounded-lg bg-white p-3 text-xs border border-green-200 font-mono text-gray-700 shadow-inner">
                        {state.key}
                    </code>
                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Provide this key to the Business Owner to activate their license.
                    </p>
                </div>
            )}
        </div>
    )
}
