'use client'

import { createSupplier } from "@/app/actions/suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function SupplierForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await createSupplier(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Supplier added successfully")
            router.push("/dashboard/inventory/suppliers")
            router.refresh()
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
                <Label htmlFor="name">Supplier Name</Label>
                <Input id="name" name="name" placeholder="e.g. Metro Cash & Carry" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Person</Label>
                    <Input id="contactName" name="contactName" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" placeholder="+91 98765..." required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="sales@vendor.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="gstNo">GST / Tax ID</Label>
                    <Input id="gstNo" name="gstNo" placeholder="27ABCDE..." />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" placeholder="Full billing address..." />
            </div>

            <div className="pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Create Supplier"}
                </Button>
            </div>
        </form>
    )
}
