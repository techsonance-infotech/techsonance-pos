"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { verifyPin, createPin } from "@/app/actions/pin"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

const initialState = {
    error: "",
}

function SubmitButton({ text, disabled }: { text: string, disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className="flex w-full justify-center rounded-md bg-orange-600 px-3 py-4 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 h-12"
        >
            {pending ? <Loader2 className="animate-spin h-5 w-5" /> : text}
        </Button>
    )
}

// Reusable 4-digit input component
function PinInputGroup({
    id,
    value,
    onChange,
    label,
    autoFocus = false
}: {
    id: string,
    value: string[],
    onChange: (val: string[]) => void,
    label: string,
    autoFocus?: boolean
}) {
    const inputs = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        if (autoFocus && inputs.current[0]) {
            inputs.current[0].focus()
        }
    }, [autoFocus])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace") {
            if (!value[index] && index > 0) {
                // Determine previous input and focus
                inputs.current[index - 1]?.focus()
                const newValue = [...value]
                newValue[index - 1] = ""
                onChange(newValue)
            } else {
                const newValue = [...value]
                newValue[index] = ""
                onChange(newValue)
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const val = e.target.value
        if (!/^\d*$/.test(val)) return // Only allow numbers

        const newValue = [...value]

        // Handle paste or multi-char input (take the last char appropriately)
        // If user types a single digit
        if (val.length <= 1) {
            newValue[index] = val
            onChange(newValue)

            // Auto-advance
            if (val && index < 3) {
                inputs.current[index + 1]?.focus()
            }
        }
        // Handle weird edge cases or fast typing? 
        // Ideally we just take the last char if it's length 1. 
        // If length > 1, it might be a paste handled by onPaste preferably
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData("text").slice(0, 4).split("")
        if (pastedData.every(char => /^\d$/.test(char))) {
            const newValue = [...value]
            pastedData.forEach((char, i) => {
                if (i < 4) newValue[i] = char
            })
            onChange(newValue)
            // Focus the last filled input or the first empty one? 
            // Focus the 4th input if full paste
            if (pastedData.length === 4) {
                inputs.current[3]?.focus()
            } else {
                inputs.current[pastedData.length]?.focus()
            }
        }
    }

    return (
        <div className="space-y-4">
            <Label htmlFor={`${id}-0`} className="block text-center text-gray-700 mb-2">{label}</Label>
            <div className="flex gap-4 justify-center">
                {[0, 1, 2, 3].map((index) => (
                    <Input
                        key={index}
                        id={`${id}-${index}`}
                        ref={(el) => { inputs.current[index] = el }}
                        type="password"
                        inputMode="numeric"
                        value={value[index] || ""}
                        onChange={(e) => handleChange(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        className="h-14 w-14 text-center text-2xl font-bold rounded-lg border-2 border-slate-200 focus:border-orange-500 focus:ring-0 transition-all shadow-sm"
                        maxLength={1}
                        autoComplete="off"
                    />
                ))}
            </div>
        </div>
    )
}

export function PinForm({ mode, userId }: { mode: 'create' | 'enter', userId: string }) {
    const action = mode === 'create' ? createPin : verifyPin
    const [state, formAction] = useActionState(action, initialState)

    // State for the inputs
    const [pin, setPin] = useState(["", "", "", ""])
    const [confirmPin, setConfirmPin] = useState(["", "", "", ""])

    // Validation for create mode
    const pinString = pin.join("")
    const confirmPinString = confirmPin.join("")
    const isComplete = pinString.length === 4
    const isConfirmComplete = confirmPinString.length === 4
    const isMatch = mode === 'create' ? pinString === confirmPinString : true

    return (
        <form action={formAction} className="mt-8 space-y-8">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="pin" value={pinString} />

            {mode === 'create' ? (
                <>
                    <input type="hidden" name="confirmPin" value={confirmPinString} />
                    <PinInputGroup
                        id="pin"
                        label="Enter 4-Digit PIN"
                        value={pin}
                        onChange={setPin}
                        autoFocus
                    />
                    <PinInputGroup
                        id="confirmPin"
                        label="Confirm 4-Digit PIN"
                        value={confirmPin}
                        onChange={setConfirmPin}
                    />
                    {!isMatch && isConfirmComplete && (
                        <p className="text-red-500 text-sm text-center font-medium">PINs do not match</p>
                    )}
                </>
            ) : (
                <PinInputGroup
                    id="pin"
                    label="Enter Your PIN"
                    value={pin}
                    onChange={setPin}
                    autoFocus
                />
            )}

            {state?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm text-center font-medium">{state.error}</p>
                </div>
            )}

            <div>
                <SubmitButton
                    text={mode === 'create' ? 'Set PIN' : 'Unlock POS'}
                    disabled={!isComplete || (mode === 'create' && (!isConfirmComplete || !isMatch))}
                />
            </div>
        </form>
    )
}
