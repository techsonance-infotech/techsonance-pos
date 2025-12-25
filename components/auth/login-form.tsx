"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn } from "lucide-react"
import { login } from "@/app/actions/auth"

const initialState = {
    error: "",
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full h-12 bg-[#d97706] hover:bg-[#b45309] text-white text-md font-medium">
            {pending ? "Logging in..." : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
        </Button>
    )
}

export function LoginForm() {
    const [state, formAction] = useActionState(login, initialState)

    return (
        <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="identifier" className="text-stone-600">Username or Email</Label>
                <Input
                    id="identifier"
                    name="identifier"
                    placeholder="Enter your username or email"
                    required
                    className="h-12 bg-white"
                />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center">
                    <Label htmlFor="password" className="text-stone-600">Password</Label>
                </div>
                <Input id="password" name="password" type="password" placeholder="Enter your password" required className="h-12 bg-white" />
            </div>
            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
            <SubmitButton />
        </form>
    )
}
