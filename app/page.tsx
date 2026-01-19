import { LogIn } from "lucide-react"
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
      <div className="hidden lg:block relative text-white bg-[#f0e4d4]">
        <div className="absolute inset-0">
          <Image
            src="/login-panel-v2.jpg"
            alt="SyncServe Login Illustration"
            fill
            className="object-cover"
            priority
          />
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
    </div >
  )
}
