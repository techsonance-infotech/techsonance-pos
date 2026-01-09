'use client'

import { createBulkLicenses } from "@/app/actions/license"
import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Download, Loader2, CheckCircle, XCircle, Copy } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Store {
    id: string
    name: string
    location: string | null
    users: { email: string, username: string }[]
}

export function MultiAccountActivation({ stores }: { stores: Store[] }) {
    const [selectedStores, setSelectedStores] = useState<string[]>([])
    const [type, setType] = useState("PERPETUAL")
    const [open, setOpen] = useState(false)

    const [state, action, isPending] = useActionState(async (prev: any, formData: FormData) => {
        // Add selected stores to formData
        selectedStores.forEach((id: any) => formData.append("storeIds", id))

        const result = await createBulkLicenses(formData)
        if (result.error) {
            toast.error(result.error)
            return { error: result.error }
        }
        if (result.success && result.results) {
            const successCount = result.results.filter((r: any) => r.success).length
            const failCount = result.results.filter((r: any) => !r.success).length

            if (failCount === 0) {
                toast.success(`Successfully generated ${successCount} licenses!`)
            } else {
                toast.warning(`Generated ${successCount} licenses, ${failCount} failed`)
            }

            return { success: true, results: result.results }
        }
        return prev
    }, null)

    const toggleStore = (storeId: string) => {
        setSelectedStores(prev =>
            prev.includes(storeId)
                ? prev.filter(id => id !== storeId)
                : [...prev, storeId]
        )
    }

    const toggleAll = () => {
        if (selectedStores.length === stores.length) {
            setSelectedStores([])
        } else {
            setSelectedStores(stores.map(s => s.id))
        }
    }

    const downloadCSV = () => {
        if (!state?.results) return

        const csv = [
            ['Store Name', 'License Key', 'Status', 'Error'].join(','),
            ...state.results.map((r: any) => [
                r.storeName,
                r.success ? r.key : '',
                r.success ? 'Success' : 'Failed',
                r.error || ''
            ].join(','))
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `licenses-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const copyAllKeys = () => {
        if (!state?.results) return

        const keys = state.results
            .filter((r: any) => r.success)
            .map((r: any) => `${r.storeName}: ${r.key}`)
            .join('\n\n')

        navigator.clipboard.writeText(keys)
        toast.success("All license keys copied to clipboard!")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Bulk Generate
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Multi-Account License Generation</DialogTitle>
                    <DialogDescription>
                        Generate licenses for multiple stores at once
                    </DialogDescription>
                </DialogHeader>

                {!state?.success ? (
                    <form action={action} className="space-y-6">
                        {/* Store Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Select Stores ({selectedStores.length} selected)</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAll}
                                >
                                    {selectedStores.length === stores.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                                {stores.map(store => {
                                    const owner = store.users[0]
                                    return (
                                        <div key={store.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                            <Checkbox
                                                id={store.id}
                                                checked={selectedStores.includes(store.id)}
                                                onCheckedChange={() => toggleStore(store.id)}
                                            />
                                            <label
                                                htmlFor={store.id}
                                                className="flex-1 text-sm cursor-pointer"
                                            >
                                                <div className="font-medium">{store.name}</div>
                                                {owner && (
                                                    <div className="text-xs text-gray-500">{owner.email}</div>
                                                )}
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* License Type */}
                        <div className="space-y-2">
                            <Label htmlFor="type">License Type</Label>
                            <Select name="type" value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERPETUAL">Perpetual (Lifetime)</SelectItem>
                                    <SelectItem value="ANNUAL">Annual</SelectItem>
                                    <SelectItem value="TRIAL">Trial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Expiry Date */}
                        {type !== 'PERPETUAL' && (
                            <div className="space-y-2">
                                <Label htmlFor="expiryDate">Expiry Date</Label>
                                <Input type="date" name="expiryDate" required />
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                disabled={isPending || selectedStores.length === 0}
                                className="flex-1"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating {selectedStores.length} licenses...
                                    </>
                                ) : (
                                    `Generate ${selectedStores.length} Licenses`
                                )}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-semibold">
                                        {state.results.filter((r: any) => r.success).length} Successful
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700">
                                    <XCircle className="h-5 w-5" />
                                    <span className="font-semibold">
                                        {state.results.filter((r: any) => !r.success).length} Failed
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button onClick={downloadCSV} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Download CSV
                            </Button>
                            <Button onClick={copyAllKeys} variant="outline" className="gap-2">
                                <Copy className="h-4 w-4" />
                                Copy All Keys
                            </Button>
                        </div>

                        {/* Results */}
                        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                            {state.results.map((result: any, index: number) => (
                                <div
                                    key={index}
                                    className={`p-4 border-b last:border-0 ${result.success ? 'bg-white' : 'bg-red-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {result.success ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            <span className="font-medium">{result.storeName}</span>
                                        </div>
                                    </div>
                                    {result.success ? (
                                        <code className="block text-xs bg-gray-50 p-2 rounded break-all font-mono">
                                            {result.key}
                                        </code>
                                    ) : (
                                        <p className="text-sm text-red-600">{result.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={() => {
                                setOpen(false)
                                setSelectedStores([])
                            }}
                            className="w-full"
                        >
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
