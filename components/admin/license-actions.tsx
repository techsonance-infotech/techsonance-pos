'use client'

import { makeLicensePerpetual, revokeLicense } from "@/app/actions/license"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import { Infinity, Ban } from "lucide-react"

export function LicenseActions({ licenseId, isPerpetual, status }: { licenseId: string, isPerpetual: boolean, status: string }) {
    const [loading, setLoading] = useState(false)

    const handleMakePerpetual = async () => {
        setLoading(true)
        try {
            const result = await makeLicensePerpetual(licenseId)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("License updated to Perpetual!")
            }
        } catch (e) {
            toast.error("Failed to update license")
        } finally {
            setLoading(false)
        }
    }

    const handleRevoke = async () => {
        if (!confirm("Are you sure you want to revoke this license? This will verify immediately for online users.")) return;
        setLoading(true)
        try {
            const result = await revokeLicense(licenseId)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("License Revoked!")
            }
        } catch (e) {
            toast.error("Failed to revoke")
        } finally {
            setLoading(false)
        }
    }

    if (status === 'REVOKED') return <span className="text-xs text-red-500 font-medium">Revoked</span>

    return (
        <div className="flex items-center gap-2">
            {!isPerpetual && (
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={handleMakePerpetual}
                    disabled={loading}
                    title="Stop Expiry (Make Perpetual)"
                >
                    <Infinity className="h-4 w-4" />
                </Button>
            )}
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleRevoke}
                disabled={loading}
                title="Revoke License"
            >
                <Ban className="h-4 w-4" />
            </Button>
        </div>
    )
}
