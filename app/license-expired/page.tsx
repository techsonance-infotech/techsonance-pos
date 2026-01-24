'use client'

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { verifyPaymentAndActivate, manualActivate } from "@/app/actions/subscription"
import { toast } from "sonner"
import { Loader2, Key, CheckCircle, Smartphone } from "lucide-react"

export default function LicenseExpiredPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    // Auto Activation Params
    const paymentId = searchParams.get('paymentId')
    const status = searchParams.get('status')

    const [loading, setLoading] = useState(false)
    const [manualKey, setManualKey] = useState("")
    const [activationSuccess, setActivationSuccess] = useState(false)

    useEffect(() => {
        if (paymentId && status === 'success' && !activationSuccess) {
            handleAutoActivation()
        }
    }, [paymentId, status])

    const handleAutoActivation = async () => {
        setLoading(true)
        const res = await verifyPaymentAndActivate(paymentId!)
        if (res.success) {
            setActivationSuccess(true)
            toast.success("License Activated Successfully!")
            setTimeout(() => {
                // Force full reload to refresh session/middleware
                window.location.href = '/dashboard'
            }, 3000)
        } else {
            toast.error(res.error || "Activation Failed")
            setLoading(false)
        }
    }

    const handleManualSubmit = async () => {
        if (!manualKey) return
        setLoading(true)
        const res = await manualActivate(manualKey)
        if (res.success) {
            setActivationSuccess(true)
            toast.success("License Validated!")
            setTimeout(() => {
                window.location.href = '/dashboard'
            }, 3000)
        } else {
            toast.error(res.error || "Invalid License Key")
            setLoading(false)
        }
    }

    if (activationSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center space-y-4">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-bounce" />
                    <h1 className="text-3xl font-bold">You are Live!</h1>
                    <p className="text-slate-400">Redirecting to dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Key className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl">License Required</CardTitle>
                    <CardDescription>Your trial has expired or no license is found.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Auto Activation Loading */}
                    {loading && paymentId && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <p className="text-sm font-medium">Verifying Payment & Generating Key...</p>
                        </div>
                    )}

                    {/* Manual Entry */}
                    {!paymentId && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Enter License Key</Label>
                                <Input
                                    placeholder="SYNC-PRO-XXXX-YEAR"
                                    className="font-mono uppercase"
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Check your email for the key if you purchased online.
                                </p>
                            </div>
                            <Button className="w-full" onClick={handleManualSubmit} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Activate Manually
                            </Button>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-1" onClick={() => router.push('/pricing')}>
                            <span className="font-bold text-lg">Buy a License Online</span>
                            <span className="text-xs text-muted-foreground">Instant Activation • Secure Payment</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center border-t py-4 bg-slate-50">
                    <p className="text-xs text-muted-foreground">Need help? Contact support@syncserve.com</p>
                </CardFooter>
            </Card>
        </div>
    )
}
