'use client'

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { initiatePayment } from "@/app/actions/subscription"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function CheckoutPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const plan = searchParams.get('plan') || 'PRO'
    const billing = searchParams.get('billing') || 'ANNUAL'
    const [loading, setLoading] = useState(false)

    const amount = plan === 'PRO' ? 4999 : 24999

    const handleProceed = async () => {
        setLoading(true)
        const res = await initiatePayment(plan as any, amount, billing as any)

        if (res.redirectUrl) {
            router.push(res.redirectUrl)
        } else {
            toast.error("Failed to initiate payment")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>Review your subscription details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Plan</span>
                        <span>{plan}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Billing Cycle</span>
                        <span>{billing}</span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-bold">
                        <span>Total Due</span>
                        <span>₹{amount.toLocaleString()}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleProceed} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Proceed to Pay
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
