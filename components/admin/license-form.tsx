'use client'

import { createLicense } from "@/app/actions/license"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useState } from "react"
import { Copy, Check, Sparkles, Building, Users, Store } from "lucide-react"
import { useRouter } from "next/navigation"

type Company = {
    id: string
    name: string
    slug: string
    users: { email: string, username: string }[]
    _count: { stores: number, users: number }
    license: {
        id: string
        type: string
        status: string
        validUntil: Date | null
        maskedKey: string | null
        createdAt: Date
    } | null
}

export function LicenseForm({ companies }: { companies: Company[] }) {
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    const [state, action, isPending] = useActionState(async (prev: any, formData: FormData) => {
        const result = await createLicense(formData)
        if (result.error) {
            toast.error(result.error)
            return { error: result.error }
        }
        if (result.success) {
            toast.success("License created successfully!")
            router.refresh()
            return { success: true, key: result.key }
        }
        return prev
    }, null)

    const [type, setType] = useState("PERPETUAL")
    const [selectedCompanyId, setSelectedCompanyId] = useState("")
    const [trialDays, setTrialDays] = useState("15")

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
                <p className="text-sm text-orange-100 mt-1">Create a license key for a company</p>
            </div>

            <form action={action} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="companyId">Select Company</Label>
                    <Select name="companyId" required value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map(company => {
                                const owner = company.users[0]
                                const hasLicense = !!company.license
                                const isExpired = company.license?.validUntil && new Date(company.license.validUntil) < new Date()
                                const isRevoked = company.license?.status === 'REVOKED'

                                let statusBadge = ''
                                if (hasLicense && company.license) {
                                    if (isRevoked) statusBadge = '🔴 Revoked'
                                    else if (isExpired) statusBadge = '🟠 Expired'
                                    else statusBadge = `🔵 ${company.license.type}`
                                } else {
                                    statusBadge = '✅ No License (Trial)'
                                }

                                return (
                                    <SelectItem key={company.id} value={company.id}>
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{company.name}</span>
                                            <span className="text-xs text-gray-400">({company.slug})</span>
                                            <span className="text-xs">{statusBadge}</span>
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>

                    {/* Company Details Preview */}
                    <div className="text-xs text-gray-500 flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" /> Stores
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> Users
                        </span>
                    </div>
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

                {type === 'TRIAL' && (
                    <div className="space-y-2">
                        <Label htmlFor="trialDays">Trial Days</Label>
                        <Input
                            type="number"
                            name="trialDays"
                            min="1"
                            value={trialDays}
                            onChange={(e) => setTrialDays(e.target.value)}
                            placeholder="e.g. 15"
                            required
                        />
                    </div>
                )}

                {/* Expiry Date Preview */}
                {type !== 'PERPETUAL' && (
                    <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-100">
                        <span className="font-semibold block mb-1">Calculated Expiry Date:</span>
                        <ExpiryPreview
                            companies={companies}
                            selectedCompanyId={selectedCompanyId}
                            type={type}
                            trialDays={trialDays}
                        />
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
                    <code className="block mt-2 break-all rounded-lg bg-white p-3 text-lg border border-green-200 font-mono text-gray-700 shadow-inner tracking-widest text-center">
                        {state.key}
                    </code>
                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Provide this key to any user in the company to activate their license.
                    </p>
                </div>
            )}
        </div>
    )
}

function ExpiryPreview({
    companies,
    selectedCompanyId,
    type,
    trialDays
}: {
    companies: Company[],
    selectedCompanyId: string,
    type: string,
    trialDays: string
}) {
    if (!selectedCompanyId) return <span className="text-gray-500 italic">Select a company to see expiry date...</span>

    const company = companies.find(c => c.id === selectedCompanyId)
    if (!company) return <span className="text-gray-500">Company not found</span>

    // Use current date as the start date for new licenses
    const startDate = new Date()
    let expiryDate = new Date(startDate)

    if (type === 'ANNUAL') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    } else if (type === 'TRIAL') {
        const days = parseInt(trialDays) || 0
        expiryDate.setDate(expiryDate.getDate() + days)
    } else {
        return null
    }

    return (
        <div className="space-y-1">
            <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium">{startDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-700">
                <span>Valid Until:</span>
                <span>{expiryDate.toLocaleDateString()}</span>
            </div>
        </div>
    )
}
