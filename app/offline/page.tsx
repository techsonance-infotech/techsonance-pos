"use client"

import { WifiOff, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function OfflinePage() {
    const router = useRouter()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full flex flex-col items-center">
                <div className="bg-red-100 p-4 rounded-full mb-6">
                    <WifiOff className="h-10 w-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">You are Offline</h1>
                <p className="text-gray-500 mb-8">
                    It seems you lost your internet connection.
                    Some pages may not be available until you reconnect.
                </p>

                <div className="space-y-3 w-full">
                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/new-order')}
                        className="w-full"
                    >
                        Go to POS (Offline Ready)
                    </Button>
                </div>
            </div>
        </div>
    )
}
