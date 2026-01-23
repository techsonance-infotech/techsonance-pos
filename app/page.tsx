
import { LoginForm } from "@/components/auth/login-form"
import fs from "fs/promises"
import path from "path"
import Image from "next/image"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'

async function getLoginConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'login-config.json')
    const configFile = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(configFile)
  } catch (error) {
    console.error('Error reading login config:', error)
    return {
      title: "SyncServe",
      description: "Sync every order, serve with speed",
      footer: "Powered by TechSonance InfoTech LLP"
    }
  }
}

export default async function LoginPage() {
  const cookieStore = await cookies()
  const sessionUserId = cookieStore.get('session_user_id')?.value

  if (sessionUserId) {
    redirect(`/pin?uid=${sessionUserId}`)
  }

  const { getBusinessSettings } = await import("@/app/actions/settings")
  const settings = await getBusinessSettings()
  const loginConfig = await getLoginConfig()

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
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

        {/* Powered by footer with link - increased section and centered */}
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

      <div className="flex items-center justify-center py-12 bg-gradient-to-b from-[#fef9f3] to-[#fdf4e8] min-h-screen">
        <div className="mx-auto grid w-[400px] gap-6 px-6">
          {/* Header */}
          <div className="grid gap-2">
            <h1 className="text-3xl font-bold text-[#1a1a1a]">Welcome back!</h1>
            <p className="text-muted-foreground text-sm">
              Login to manage your business seamlessly
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Sign up link */}
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-[#d97706] hover:underline font-semibold">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div >
  )
}
