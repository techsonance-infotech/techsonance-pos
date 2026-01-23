'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyEmail, resendVerification } from '@/app/actions/verify-email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, Loader2, ArrowRight, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function VerifyEmailPage() {
    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            {/* Left Panel - Same as login page */}
            <div className="hidden lg:flex lg:flex-col bg-white relative min-h-screen">
                <div className="flex justify-center pt-10 pb-6">
                    <Image
                        src="/syncserve-logo.png"
                        alt="SyncServe Logo"
                        width={250}
                        height={80}
                        className="object-contain"
                        priority
                    />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-8">
                    <Image
                        src="/login-illustration-new.jpg"
                        alt="SyncServe Illustration"
                        width={420}
                        height={380}
                        className="object-contain"
                        priority
                    />
                    <p className="text-[#555] text-lg leading-relaxed mt-6 text-center max-w-md">
                        Manage billing, orders, inventory & reports — all in one place.
                    </p>
                </div>
                <div className="border-t border-[#e8ddd0] px-10 py-6">
                    <a
                        href="https://www.techsonanceinfotech.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-[#888] text-sm hover:text-[#d97706] transition-colors"
                    >
                        Powered by <span className="text-[#d97706] font-medium">TechSonance InfoTech LLP</span>
                    </a>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex items-center justify-center py-12 bg-gradient-to-b from-[#fef9f3] to-[#fdf4e8] min-h-screen">
                <VerificationContent />
            </div>
        </div>
    )
}

function VerificationContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const router = useRouter()

    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>('idle')
    const [message, setMessage] = useState('')

    // Resend state
    const [resendEmail, setResendEmail] = useState('')
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [resendMessage, setResendMessage] = useState('')

    useEffect(() => {
        if (token) {
            setStatus('verifying')
            verifyEmail(token)
                .then(result => {
                    if (result.success) {
                        setStatus('success')
                        setMessage(result.message)
                    } else {
                        setStatus('error')
                        setMessage(result.message)
                    }
                })
                .catch(() => {
                    setStatus('error')
                    setMessage('Something went wrong. Please try again.')
                })
        } else {
            // No token status, show instructions or resend form
            setStatus('idle')
        }
    }, [token])

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resendEmail) return

        setResendStatus('loading')
        try {
            const result = await resendVerification(resendEmail)
            if (result.success) {
                setResendStatus('success')
                setResendMessage(result.message)
            } else {
                setResendStatus('error')
                setResendMessage(result.message)
            }
        } catch (error) {
            setResendStatus('error')
            setResendMessage('Failed to send verification email.')
        }
    }

    // Determine what to render based on status
    if (status === 'verifying') {
        return (
            <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-lg w-[400px] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#f97316]" />
                <h2 className="text-xl font-semibold">Verifying Email...</h2>
                <p className="text-gray-500">Please wait while we verify your account.</p>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-lg w-[400px] text-center">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-10 w-10 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                    <p className="text-gray-600">{message}</p>
                </div>
                <Button
                    onClick={() => router.push('/')}
                    className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-md"
                >
                    Continue to Login
                </Button>
            </div>
        )
    }

    // Show error or empty state (e.g. if visited without token)
    return (
        <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-lg w-[420px]">
            {status === 'error' && (
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                        <X className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Verification Failed</h2>
                    <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm w-full">
                        {message}
                    </p>
                </div>
            )}

            {/* If no token or error, show resend form */}
            <div className="w-full space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {status === 'error' ? 'Resend Verification Link' : 'Verify Your Email'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Enter your email address to receive a new verification link.
                    </p>
                </div>

                <form onSubmit={handleResend} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="Enter your email address"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            required
                            className="h-11"
                        />
                    </div>

                    {resendStatus === 'success' && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                            <Check className="h-4 w-4" />
                            {resendMessage}
                        </div>
                    )}

                    {resendStatus === 'error' && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            {resendMessage}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={resendStatus === 'loading'}
                        className="w-full h-11 bg-[#f97316] hover:bg-[#ea580c] text-white"
                    >
                        {resendStatus === 'loading' ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                            </span>
                        ) : 'Send Verification Link'}
                    </Button>
                </form>

                <div className="pt-4 border-t border-gray-100 text-center">
                    <Link href="/" className="text-sm text-[#d97706] hover:underline font-medium flex items-center justify-center gap-1">
                        <ArrowRight className="h-3 w-3 rotate-180" /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
