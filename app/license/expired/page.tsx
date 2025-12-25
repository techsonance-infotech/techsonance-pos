import { ReactivateForm } from "@/components/license/reactivate-form"
import { Lock } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function LicenseExpiredPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-red-50">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-xl border border-red-100">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
                        <Lock className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">License Expired</h1>
                    <p className="mt-4 text-gray-600">
                        Your product license has expired or is invalid.
                        Please contact the administrator or enter a new valid product key below to continue using the software.
                    </p>
                </div>

                <ReactivateForm />

                <div className="text-center text-xs text-muted-foreground mt-8">
                    <p>{(await import("@/app/actions/settings")).getBusinessSettings().then(s => s.businessName)} POS System</p>
                </div>
            </div>
        </div>
    )
}
