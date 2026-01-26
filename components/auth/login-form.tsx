"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { login } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

const initialState = {
    error: "",
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white text-md font-semibold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                </span>
            ) : "Login"}
        </Button>
    )
}

// Loading overlay component
function FormPendingOverlay() {
    const { pending } = useFormStatus()
    if (!pending) return null

    return (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl z-50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium text-gray-700">Signing you in...</p>
        </div>
    )
}

export function LoginForm() {
    const router = useRouter()
    const [state, formAction] = useActionState(login, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Form state for validation
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    // Validation rules
    const isIdentifierValid = identifier.length >= 3
    const isPasswordValid = password.length >= 1

    // Check if field should show error
    const showIdentifierError = touched.identifier && !isIdentifierValid && identifier !== ''
    const showPasswordError = touched.password && !isPasswordValid && password !== ''

    // Form validity
    const isFormValid = isIdentifierValid && isPasswordValid

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    return (
        <form action={formAction} className="grid gap-5 relative">
            <FormPendingOverlay />

            {/* Redirect Loader Overlay */}
            {isRedirecting && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="text-sm font-medium text-gray-700">Redirecting...</p>
                </div>
            )}

            {/* Email / Username Field */}
            <div className="grid gap-2">
                <Label htmlFor="identifier" className="text-[#333] font-medium text-sm">
                    Email / Username
                </Label>
                <Input
                    id="identifier"
                    name="identifier"
                    placeholder="Enter your email or username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onBlur={() => handleBlur('identifier')}
                    className={`h-12 bg-white border rounded-lg focus:ring-1 focus:ring-[#f97316] ${showIdentifierError
                        ? 'border-red-500 focus:border-red-500'
                        : touched.identifier && isIdentifierValid
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-[#e5e5e5] focus:border-[#f97316]'
                        }`}
                />
                {showIdentifierError && (
                    <p className="text-xs text-red-500">Please enter a valid email or username (min 3 characters)</p>
                )}
            </div>

            {/* Password Field */}
            <div className="grid gap-2">
                <Label htmlFor="password" className="text-[#333] font-medium text-sm">
                    Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        className={`h-12 bg-white border rounded-lg pr-12 focus:ring-1 focus:ring-[#f97316] ${showPasswordError
                            ? 'border-red-500 focus:border-red-500'
                            : touched.password && isPasswordValid
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-[#e5e5e5] focus:border-[#f97316]'
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {showPasswordError && (
                    <p className="text-xs text-red-500">Password is required</p>
                )}
            </div>

            {/* Keep me logged in & Forgot Password */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {/* Using native checkbox for proper form submission */}
                    <input
                        type="checkbox"
                        id="keep_logged_in"
                        name="keep_logged_in"
                        className="h-4 w-4 rounded border-gray-300 text-[#f97316] focus:ring-[#f97316] cursor-pointer"
                    />
                    <label
                        htmlFor="keep_logged_in"
                        className="text-sm text-gray-600 cursor-pointer select-none"
                    >
                        Keep me logged in
                    </label>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setIsRedirecting(true)
                        setTimeout(() => router.push('/forgot-password'), 500)
                    }}
                    className="text-sm text-[#f97316] hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
                    disabled={isRedirecting}
                >
                    Forgot password?
                </button>
            </div>

            {/* Error Message */}
            {state?.error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                    {state.error}
                </p>
            )}

            {/* Submit Button */}
            <SubmitButton disabled={!isFormValid} />
        </form>
    )
}
