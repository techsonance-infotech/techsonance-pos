import { UserPlus } from "lucide-react"
import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
    const { getBusinessSettings } = await import("@/app/actions/settings")
    const settings = await getBusinessSettings()

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="hidden lg:block relative text-white bg-[#f0e4d4]">
                <div className="absolute inset-0">
                    <Image
                        src="/login-panel-v2.jpg"
                        alt="SyncServe Registration Illustration"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>
            <div className="flex items-center justify-center py-12 bg-white">
                <div className="mx-auto grid w-[400px] gap-6">
                    <div className="grid gap-2 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-[#fceed5] p-3 rounded-full">
                                <UserPlus className="w-6 h-6 text-[#d97706]" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-normal text-[#1a1a1a]">Create Account</h1>
                        <p className="text-balance text-muted-foreground">
                            Register for a new POS account
                        </p>
                    </div>
                    <RegisterForm />
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/" className="text-[#d97706] hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
