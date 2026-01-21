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
import { Check, X, Eye, EyeOff } from "lucide-react"

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white text-md font-semibold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending || disabled}
        >
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
    const [businessName, setBusinessName] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [contactNo, setContactNo] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Validation state
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    // Business Name validation
    const isBusinessNameValid = businessName.trim().length >= 3

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
    const isFormValid = isBusinessNameValid && isUsernameValid && isEmailValid && isPhoneValid && isPasswordStrong && passwordsMatch

    // Handle phone input - only allow numbers
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
        setContactNo(value)
    }

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    // Get input class based on validation state
    const getInputClass = (isValid: boolean, fieldName: string, value: string) => {
        const baseClass = "h-14 text-base bg-white border rounded-lg focus:ring-1 focus:ring-[#f97316]"
        if (!touched[fieldName] || value === '') return `${baseClass} border-[#e5e5e5] focus:border-[#f97316]`
        return isValid
            ? `${baseClass} border-green-500 focus:border-green-500`
            : `${baseClass} border-red-500 focus:border-red-500`
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
        <form action={formAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Name Field */}
            <div className="grid gap-2">
                <Label htmlFor="businessName" className="text-[#333] font-medium text-sm">Business Name</Label>
                <Input
                    id="businessName"
                    name="businessName"
                    type="text"
                    placeholder="Enter your business name"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                    className={getInputClass(isBusinessNameValid, 'businessName', businessName)}
                    autoFocus
                />
                {touched.businessName && businessName && !isBusinessNameValid && (
                    <p className="text-xs text-red-500">Business name must be at least 3 characters</p>
                )}
            </div>

            {/* Username Field */}
            <div className="grid gap-2">
                <Label htmlFor="username" className="text-[#333] font-medium text-sm">Username</Label>
                <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => handleBlur('username')}
                    className={getInputClass(isUsernameValid, 'username', username)}
                />
                {touched.username && username && !isUsernameValid && (
                    <p className="text-xs text-red-500">3-20 characters, letters, numbers, underscores only</p>
                )}
            </div>

            {/* Email Field */}
            <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#333] font-medium text-sm">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={getInputClass(isEmailValid, 'email', email)}
                />
                {touched.email && email && !isEmailValid && (
                    <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
            </div>

            {/* Contact Number Field */}
            <div className="grid gap-2">
                <Label htmlFor="contactNo" className="text-[#333] font-medium text-sm">Contact Number (Optional)</Label>
                <Input
                    id="contactNo"
                    name="contactNo"
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={contactNo}
                    onChange={handlePhoneChange}
                    onBlur={() => handleBlur('contactNo')}
                    className={getInputClass(isPhoneValid, 'contactNo', contactNo)}
                />
                {touched.contactNo && contactNo && !isPhoneValid && (
                    <p className="text-xs text-red-500">Must be exactly 10 digits</p>
                )}
            </div>

            {/* Password Field */}
            <div className="grid gap-2">
                <Label htmlFor="password" className="text-[#333] font-medium text-sm">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        className={`${getInputClass(isPasswordStrong, 'password', password)} pr-12`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {password && (
                    <div className="grid grid-cols-2 gap-1 mt-1">
                        <PasswordRequirement met={hasMinLength} text="8+ chars" />
                        <PasswordRequirement met={hasUppercase} text="Uppercase" />
                        <PasswordRequirement met={hasLowercase} text="Lowercase" />
                        <PasswordRequirement met={hasNumber} text="Number" />
                        <PasswordRequirement met={hasSpecial} text="Special" />
                    </div>
                )}
            </div>

            {/* Confirm Password Field */}
            <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-[#333] font-medium text-sm">Confirm Password</Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        className={`${getInputClass(passwordsMatch, 'confirmPassword', confirmPassword)} pr-12`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {touched.confirmPassword && confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Match
                    </p>
                )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 mt-2">
                <SubmitButton disabled={!isFormValid} />
            </div>
        </form>
    )
}
