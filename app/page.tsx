import { LogIn } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const { getBusinessSettings } = await import("@/app/actions/settings")
  const settings = await getBusinessSettings()

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-stone-900 lg:block relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#a69281] to-[#786a5d] flex items-center justify-center">
          <div className="text-center text-white space-y-2">
            <h1 className="text-6xl font-normal tracking-tight">{settings.businessName}</h1>
            <p className="text-lg opacity-90 font-light">Modern Point of Sale System</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 bg-white">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#fceed5] p-3 rounded-full">
                <LogIn className="w-6 h-6 text-[#d97706]" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-[#1a1a1a]">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Sign in to your POS account
            </p>
          </div>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <a href="/register" className="text-[#d97706] hover:underline font-medium">
              Register
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
