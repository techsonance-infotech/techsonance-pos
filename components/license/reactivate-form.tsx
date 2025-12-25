'use client'

import { reactivateMyStoreLicense } from "@/app/actions/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function ReactivateForm() {
    const [key, setKey] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await reactivateMyStoreLicense(key)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("License Activated!")
                router.push("/dashboard")
            }
        } catch (err) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-6 w-full">
            <div className="space-y-2 text-left">
                <Label htmlFor="key">Product Key</Label>
                <Input
                    id="key"
                    placeholder="Enter valid product key..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    required
                    className="font-mono text-sm"
                />
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                {loading ? "Verifying..." : "Activate License"}
            </Button>
        </form>
    )
}
