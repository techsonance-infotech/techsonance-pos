'use client'

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { registerUser } from "@/app/actions/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full bg-[#d97706] hover:bg-[#b45309]" disabled={pending}>
            {pending ? "Creating Account..." : "Create Account"}
        </Button>
    )
}

export function RegisterForm() {
    const router = useRouter()
    const [state, formAction] = useActionState(registerUser, null)

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
                    className="border-gray-300 focus:border-[#d97706] focus:ring-[#d97706]"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    className="border-gray-300 focus:border-[#d97706] focus:ring-[#d97706]"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="contactNo">Contact Number (Optional)</Label>
                <Input
                    id="contactNo"
                    name="contactNo"
                    type="tel"
                    placeholder="+1234567890"
                    className="border-gray-300 focus:border-[#d97706] focus:ring-[#d97706]"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="border-gray-300 focus:border-[#d97706] focus:ring-[#d97706]"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="border-gray-300 focus:border-[#d97706] focus:ring-[#d97706]"
                />
            </div>
            <SubmitButton />
        </form>
    )
}
