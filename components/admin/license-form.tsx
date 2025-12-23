'use client'

import { createLicense } from "@/app/actions/license"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useEffect, useState } from "react"

export function LicenseForm({ stores }: {
    stores: {
        id: string,
        name: string,
        users: { email: string, username: string }[]
    }[]
}) {
    // Basic form state handling
    const [state, action, isPending] = useActionState(async (prev: any, formData: FormData) => {
        const result = await createLicense(formData)
        if (result.error) {
            toast.error(result.error)
            return { error: result.error }
        }
        if (result.success) {
            toast.success("License created successfully!")
            return { success: true, key: result.key }
        }
        return prev
    }, null)

    const [type, setType] = useState("PERPETUAL")

    return (
        <div className="space-y-6 rounded-lg border p-6 shadow-sm bg-white">
            <h3 className="text-lg font-medium">Generate New License</h3>

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
                                const label = owner ? `${store.name} (${owner.email})` : store.name
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
                            <SelectItem value="PERPETUAL">Perpetual (Lifetime)</SelectItem>
                            <SelectItem value="ANNUAL">Annual</SelectItem>
                            <SelectItem value="TRIAL">Trial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {type !== 'PERPETUAL' && (
                    <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input type="date" name="expiryDate" required />
                    </div>
                )}

                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Generating..." : "Generate License"}
                </Button>
            </form>

            {state?.success && state.key && (
                <div className="mt-4 rounded-md bg-green-50 p-4 border border-green-200">
                    <p className="text-sm text-green-800 font-medium">License Generated:</p>
                    <code className="block mt-2 break-all rounded bg-white p-2 text-xs border">
                        {state.key}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                        Copy this key and provide it to the Business Owner.
                    </p>
                </div>
            )}
        </div>
    )
}
