import Image from "next/image"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            {/* Left Panel - Same as login page */}
            <div className="hidden lg:flex lg:flex-col bg-white relative min-h-screen">
                {/* Logo at top center */}
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

                {/* Illustration and description text in center */}
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

                {/* Powered by footer with link */}
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

            {/* Right Panel - Forgot Password Form */}
            <div className="flex items-center justify-center py-12 bg-gradient-to-b from-[#fef9f3] to-[#fdf4e8] min-h-screen">
                <div className="mx-auto grid w-[420px] gap-6 px-6">
                    {/* Forgot Password Form */}
                    <ForgotPasswordForm />

                </div>
            </div>
        </div>
    )
}
