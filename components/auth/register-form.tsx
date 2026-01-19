'use client'

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { registerUser } from "@/app/actions/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full bg-[#d97706] hover:bg-[#b45309]" disabled={pending || disabled}>
            {pending ? "Creating Account..." : "Create Account"}
        </Button>
    )
}

// Password requirement indicator
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{text}</span>
        </div>
    )
}

export function RegisterForm() {
    const router = useRouter()
    const [state, formAction] = useActionState(registerUser, null)

    // Form state for validation
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [contactNo, setContactNo] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Username validation
    const isUsernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)

    // Email validation
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    // Phone validation (10 digits only)
    const isPhoneValid = contactNo === '' || /^\d{10}$/.test(contactNo)

    // Password validations
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    // Confirm password validation
    const passwordsMatch = password === confirmPassword && confirmPassword !== ''

    // Overall form validity
    const isFormValid = isUsernameValid && isEmailValid && isPhoneValid && isPasswordStrong && passwordsMatch

    // Handle phone input - only allow numbers
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
        setContactNo(value)
    }

    useEffect(() => {
        if (state?.error) {
            toast.error(state.error)
        }
        if (state?.success) {
            toast.success(state.message || "Registration successful!")
            setTimeout(() => {
                router.push('/')
            }, 2000)
        }
    }, [state, router])

    return (
        <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`border-gray-300 focus:border-[#d97706] focus:ring-[#d97706] ${username && !isUsernameValid ? 'border-red-500' : username && isUsernameValid ? 'border-green-500' : ''
                        }`}
                />
                {username && !isUsernameValid && (
                    <p className="text-xs text-red-500">3-20 characters, letters, numbers, underscores only</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`border-gray-300 focus:border-[#d97706] focus:ring-[#d97706] ${email && !isEmailValid ? 'border-red-500' : email && isEmailValid ? 'border-green-500' : ''
                        }`}
                />
                {email && !isEmailValid && (
                    <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="contactNo">Contact Number (10 digits)</Label>
                <Input
                    id="contactNo"
                    name="contactNo"
                    type="tel"
                    placeholder="9876543210"
                    value={contactNo}
                    onChange={handlePhoneChange}
                    className={`border-gray-300 focus:border-[#d97706] focus:ring-[#d97706] ${contactNo && !isPhoneValid ? 'border-red-500' : contactNo && isPhoneValid ? 'border-green-500' : ''
                        }`}
                />
                {contactNo && !isPhoneValid && (
                    <p className="text-xs text-red-500">Must be exactly 10 digits</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`border-gray-300 focus:border-[#d97706] focus:ring-[#d97706] ${password && !isPasswordStrong ? 'border-amber-500' : password && isPasswordStrong ? 'border-green-500' : ''
                        }`}
                />
                {password && (
                    <div className="grid grid-cols-2 gap-1 mt-1">
                        <PasswordRequirement met={hasMinLength} text="8+ characters" />
                        <PasswordRequirement met={hasUppercase} text="Uppercase (A-Z)" />
                        <PasswordRequirement met={hasLowercase} text="Lowercase (a-z)" />
                        <PasswordRequirement met={hasNumber} text="Number (0-9)" />
                        <PasswordRequirement met={hasSpecial} text="Special (!@#$%)" />
                    </div>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`border-gray-300 focus:border-[#d97706] focus:ring-[#d97706] ${confirmPassword && !passwordsMatch ? 'border-red-500' : confirmPassword && passwordsMatch ? 'border-green-500' : ''
                        }`}
                />
                {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Passwords match
                    </p>
                )}
            </div>
            <SubmitButton disabled={!isFormValid} />
        </form>
    )
}
