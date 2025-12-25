"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { verifyPin, createPin } from "@/app/actions/pin"

const initialState = {
    error: "",
}

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending}
            className="flex w-full justify-center rounded-md bg-orange-600 px-3 py-4 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
            {pending ? "Processing..." : text}
        </Button>
    )
}

export function PinForm({ mode, userId }: { mode: 'create' | 'enter', userId: string }) {
    const action = mode === 'create' ? createPin : verifyPin
    const [state, formAction] = useActionState(action, initialState)

    return (
        <form action={formAction} className="mt-8 space-y-6">
            <input type="hidden" name="userId" value={userId} />
            <div className="-space-y-px rounded-md shadow-sm">
                {mode === 'create' ? (
                    <>
                        <div className="grid gap-2 mb-4">
                            <Label htmlFor="pin">New PIN</Label>
                            <Input
                                id="pin"
                                name="pin"
                                type="password"
                                inputMode="numeric"
                                required
                                className="h-12 text-center text-lg tracking-widest"
                                placeholder="Enter 4-6 digit PIN"
                                maxLength={6}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPin">Confirm PIN</Label>
                            <Input
                                id="confirmPin"
                                name="confirmPin"
                                type="password"
                                inputMode="numeric"
                                required
                                className="h-12 text-center text-lg tracking-widest"
                                placeholder="Confirm PIN"
                                maxLength={6}
                            />
                        </div>
                    </>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="pin" className="sr-only">PIN</Label>
                        <Input
                            id="pin"
                            name="pin"
                            type="password"
                            inputMode="numeric"
                            required
                            className="h-12 text-center text-2xl tracking-[1em]"
                            placeholder="••••"
                            maxLength={6}
                            autoFocus
                        />
                    </div>
                )}
            </div>
            {state?.error && <p className="text-red-500 text-sm text-center">{state.error}</p>}
            <div>
                <SubmitButton text={mode === 'create' ? 'Set PIN' : 'Unlock POS'} />
            </div>
        </form>
    )
}
