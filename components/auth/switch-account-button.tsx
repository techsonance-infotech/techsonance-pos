"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

export function SwitchAccountButton() {
    const { pending } = useFormStatus()
    return (
        <>
            {pending && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="text-sm font-medium text-gray-700">Signing out...</p>
                </div>
            )}
            <button
                type="submit"
                disabled={pending}
                className="text-sm text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
            >
                Switch Account
            </button>
        </>
    )
}
