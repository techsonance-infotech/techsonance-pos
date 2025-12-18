'use server'

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function verifyPin(prevState: any, formData: FormData) {
    const pin = formData.get("pin") as string
    const userId = formData.get("userId") as string

    if (!pin || !userId) {
        return { error: "Missing PIN or User ID" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return { error: "User not found" }
        }

        if (user.pin !== pin) {
            return { error: "Invalid PIN" }
        }

        // Set session cookie
        const cookieStore = await cookies()
        // Set session cookie (30 days)
        cookieStore.set('session_role', user.role, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
        cookieStore.set('session_user_id', user.id, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })

        redirect("/dashboard?verified=true")

    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        return { error: "Verification failed" }
    }
}

export async function createPin(prevState: any, formData: FormData) {
    const pin = formData.get("pin") as string
    const confirmPin = formData.get("confirmPin") as string
    const userId = formData.get("userId") as string

    if (pin !== confirmPin) {
        return { error: "PINs do not match" }
    }

    if (pin.length < 4) {
        return { error: "PIN must be at least 4 digits" }
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { pin: pin }
        })

        // Set session cookie
        const cookieStore = await cookies()
        // Set session cookie (30 days)
        cookieStore.set('session_role', user.role, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
        cookieStore.set('session_user_id', user.id, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })

        redirect("/dashboard?verified=true")
    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        return { error: "Failed to set PIN" }
    }
}
