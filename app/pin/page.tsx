import { Lock, ShieldCheck } from "lucide-react"
import { PinForm } from "@/components/auth/pin-form"

import { cookies } from "next/headers"

import { redirect } from "next/navigation"

export default async function PinPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Updated for Next.js 15+
}) {
    const params = await searchParams
    let mode = params.create ? "create" : "enter"
    let userId = params.uid as string

    // Handle session re-verification (browser refresh/reopen)
    if (!userId && !params.create) {
        const cookieStore = await cookies()
        const sessionUserId = cookieStore.get('session_user_id')?.value
        if (sessionUserId) {
            userId = sessionUserId
            mode = "enter"
        } else {
            // Session expired or invalid - redirect to login
            redirect("/")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        {mode === 'create' ? <ShieldCheck className="h-6 w-6 text-orange-600" /> : <Lock className="h-6 w-6 text-orange-600" />}
                    </div>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        {mode === 'create' ? 'Create Security PIN' : 'Enter Security PIN'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {mode === 'create'
                            ? 'Set up a PIN for quick access to your POS'
                            : 'Please enter your PIN to continue'}
                    </p>
                </div>

                <PinForm mode={mode as 'create' | 'enter'} userId={userId} />
            </div>
        </div>
    )
}
