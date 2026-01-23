'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Key, Lock, Eye, EyeOff, Check, X, ArrowLeft, Loader2 } from 'lucide-react'
import {
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword,
    resendOTP
} from '@/app/actions/forgot-password'
import { useRouter } from 'next/navigation'

// Step indicator types
type Step = 'email' | 'otp' | 'password' | 'success'

// Submit button with loading state
function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white text-md font-semibold rounded-lg shadow-md disabled:opacity-50"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Please wait...
                </span>
            ) : children}
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

// Step Progress Indicator
function StepIndicator({ currentStep }: { currentStep: Step }) {
    const steps = [
        { key: 'email', label: 'Email', icon: Mail },
        { key: 'otp', label: 'Verify', icon: Key },
        { key: 'password', label: 'Reset', icon: Lock },
    ]

    const getCurrentIndex = () => {
        if (currentStep === 'success') return 3
        return steps.findIndex(s => s.key === currentStep)
    }

    const currentIndex = getCurrentIndex()

    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentIndex
                const isCompleted = index < currentIndex

                return (
                    <div key={step.key} className="flex items-center">
                        <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : isActive
                                        ? 'bg-[#f97316] border-[#f97316] text-white'
                                        : 'bg-gray-100 border-gray-300 text-gray-400'
                                }`}
                        >
                            {isCompleted ? (
                                <Check className="h-5 w-5" />
                            ) : (
                                <Icon className="h-5 w-5" />
                            )}
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`w-8 h-1 mx-1 rounded ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export function ForgotPasswordForm() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('email')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [countdown, setCountdown] = useState(0)

    // Action states
    const [sendOtpState, sendOtpAction] = useActionState(sendForgotPasswordOTP, null)
    const [verifyOtpState, verifyOtpAction] = useActionState(verifyForgotPasswordOTP, null)
    const [resetPasswordState, resetPasswordAction] = useActionState(resetPassword, null)
    const [resendState, resendAction] = useActionState(resendOTP, null)

    // Password validations
    const hasMinLength = newPassword.length >= 8
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
    const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial
    const passwordsMatch = newPassword === confirmPassword && confirmPassword !== ''

    // Email validation
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    // OTP validation
    const isOtpValid = /^\d{6}$/.test(otp)

    // Handle send OTP success
    useEffect(() => {
        if (sendOtpState?.success) {
            setStep('otp')
            setCountdown(60) // Start 60 second countdown for resend
        }
    }, [sendOtpState])

    // Handle verify OTP success
    useEffect(() => {
        if (verifyOtpState?.success && verifyOtpState?.resetToken) {
            setResetToken(verifyOtpState.resetToken)
            setStep('password')
        }
    }, [verifyOtpState])

    // Handle password reset success
    useEffect(() => {
        if (resetPasswordState?.success) {
            setStep('success')
        }
    }, [resetPasswordState])

    // Handle resend OTP success
    useEffect(() => {
        if (resendState?.success) {
            setCountdown(60)
        }
    }, [resendState])

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    // Handle OTP input - only allow 6 digits
    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
        setOtp(value)
    }

    // Go back to previous step
    const goBack = () => {
        if (step === 'otp') {
            setStep('email')
            setOtp('')
        } else if (step === 'password') {
            setStep('otp')
            setNewPassword('')
            setConfirmPassword('')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="grid gap-2">
                {step !== 'success' && step !== 'email' && (
                    <button
                        type="button"
                        onClick={goBack}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#f97316] mb-2 w-fit"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>
                )}
                <h1 className="text-3xl font-bold text-[#1a1a1a]">
                    {step === 'email' && 'Forgot Password'}
                    {step === 'otp' && 'Verify OTP'}
                    {step === 'password' && 'Reset Password'}
                    {step === 'success' && 'Success!'}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {step === 'email' && 'Enter your email to receive a password reset OTP'}
                    {step === 'otp' && `We sent a 6-digit OTP to ${email}`}
                    {step === 'password' && 'Create a new secure password for your account'}
                    {step === 'success' && 'Your password has been updated successfully'}
                </p>
            </div>

            {/* Step Progress */}
            <StepIndicator currentStep={step} />

            {/* Step 1: Email Input */}
            {step === 'email' && (
                <form action={sendOtpAction} className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-[#333] font-medium text-sm">
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Enter your registered email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`h-12 bg-white border rounded-lg focus:ring-1 focus:ring-[#f97316] ${email && !isEmailValid
                                    ? 'border-red-500'
                                    : email && isEmailValid
                                        ? 'border-green-500'
                                        : 'border-[#e5e5e5]'
                                }`}
                        />
                        {email && !isEmailValid && (
                            <p className="text-xs text-red-500">Please enter a valid email address</p>
                        )}
                    </div>

                    {sendOtpState?.error && (
                        <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                            {sendOtpState.error}
                        </p>
                    )}

                    <SubmitButton disabled={!isEmailValid}>
                        Send OTP
                    </SubmitButton>
                </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
                <form action={verifyOtpAction} className="grid gap-5">
                    <input type="hidden" name="email" value={email} />

                    <div className="grid gap-2">
                        <Label htmlFor="otp" className="text-[#333] font-medium text-sm">
                            Enter 6-digit OTP
                        </Label>
                        <Input
                            id="otp"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            required
                            value={otp}
                            onChange={handleOtpChange}
                            className={`h-14 bg-white border rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:ring-1 focus:ring-[#f97316] ${otp && !isOtpValid
                                    ? 'border-red-500'
                                    : otp && isOtpValid
                                        ? 'border-green-500'
                                        : 'border-[#e5e5e5]'
                                }`}
                            maxLength={6}
                        />
                        <p className="text-xs text-gray-500 text-center">
                            OTP expires in 5 minutes
                        </p>
                    </div>

                    {verifyOtpState?.error && (
                        <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                            {verifyOtpState.error}
                        </p>
                    )}

                    <SubmitButton disabled={!isOtpValid}>
                        Verify OTP
                    </SubmitButton>

                    {/* Resend OTP */}
                    <div className="text-center">
                        {countdown > 0 ? (
                            <p className="text-sm text-gray-500">
                                Resend OTP in <span className="font-semibold text-[#f97316]">{countdown}s</span>
                            </p>
                        ) : (
                            <form action={resendAction} className="inline">
                                <input type="hidden" name="email" value={email} />
                                <button
                                    type="submit"
                                    className="text-sm text-[#f97316] hover:underline font-medium"
                                >
                                    Resend OTP
                                </button>
                            </form>
                        )}
                    </div>
                </form>
            )}

            {/* Step 3: Password Reset */}
            {step === 'password' && (
                <form action={resetPasswordAction} className="grid gap-5">
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="resetToken" value={resetToken} />

                    {/* New Password */}
                    <div className="grid gap-2">
                        <Label htmlFor="newPassword" className="text-[#333] font-medium text-sm">
                            New Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`h-12 bg-white border rounded-lg pr-12 focus:ring-1 focus:ring-[#f97316] ${newPassword && !isPasswordStrong
                                        ? 'border-amber-500'
                                        : newPassword && isPasswordStrong
                                            ? 'border-green-500'
                                            : 'border-[#e5e5e5]'
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
                        {newPassword && (
                            <div className="grid grid-cols-2 gap-1 mt-1">
                                <PasswordRequirement met={hasMinLength} text="8+ characters" />
                                <PasswordRequirement met={hasUppercase} text="Uppercase (A-Z)" />
                                <PasswordRequirement met={hasLowercase} text="Lowercase (a-z)" />
                                <PasswordRequirement met={hasNumber} text="Number (0-9)" />
                                <PasswordRequirement met={hasSpecial} text="Special (!@#$%)" />
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword" className="text-[#333] font-medium text-sm">
                            Confirm Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`h-12 bg-white border rounded-lg pr-12 focus:ring-1 focus:ring-[#f97316] ${confirmPassword && !passwordsMatch
                                        ? 'border-red-500'
                                        : confirmPassword && passwordsMatch
                                            ? 'border-green-500'
                                            : 'border-[#e5e5e5]'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-xs text-red-500">Passwords do not match</p>
                        )}
                        {confirmPassword && passwordsMatch && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Passwords match
                            </p>
                        )}
                    </div>

                    {resetPasswordState?.error && (
                        <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                            {resetPasswordState.error}
                        </p>
                    )}

                    <SubmitButton disabled={!isPasswordStrong || !passwordsMatch}>
                        Reset Password
                    </SubmitButton>
                </form>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-10 w-10 text-green-600" />
                        </div>
                    </div>
                    <p className="text-gray-600">
                        Your password has been reset successfully. You can now login with your new password.
                    </p>
                    <Button
                        onClick={() => router.push('/')}
                        className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white text-md font-semibold rounded-lg shadow-md"
                    >
                        Go to Login
                    </Button>
                </div>
            )}
        </div>
    )
}
