'use client'

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Lock } from "lucide-react"
import { useState } from "react"

export default function PaymentGatewayPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = searchParams.get('id')
    const amount = searchParams.get('amount')
    const [processing, setProcessing] = useState(false)

    const handlePayment = (status: 'success' | 'failure') => {
        setProcessing(true)
        // Simulate network delay
        setTimeout(() => {
            if (status === 'success') {
                router.push(`/license-expired?paymentId=${id}&status=success`)
            } else {
                router.push(`/checkout?error=payment_failed`)
            }
        }, 2000)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center border-b bg-white rounded-t-xl pb-6">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle>Secure Payment</CardTitle>
                    <CardDescription>Mock Payment Gateway (Razorpay/Stripe Simulation)</CardDescription>
                    <div className="mt-4 text-3xl font-bold">₹{parseInt(amount || '0').toLocaleString()}</div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Card Number</label>
                        <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
                            <CreditCard className="h-4 w-4 text-gray-500 mr-2" />
                            <input type="text" value="4242 4242 4242 4242" disabled className="bg-transparent w-full outline-none font-mono" />
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800">
                        This is a simulation. No real money will be deducted.
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                        onClick={() => handlePayment('success')}
                        disabled={processing}
                    >
                        {processing ? 'Processing...' : 'Simulate Success'}
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handlePayment('failure')}
                        disabled={processing}
                    >
                        Simulate Failure
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
