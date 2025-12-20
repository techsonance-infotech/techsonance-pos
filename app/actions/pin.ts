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
            redirect("/")
        }

        if (user.pin !== pin) {
            return { error: "Invalid PIN" }
        }

        // Set session cookie
        const cookieStore = await cookies()

        // Set session cookie (30 days)
        cookieStore.set('session_role', user.role, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
        cookieStore.set('session_user_id', user.id, { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })

        console.log("LOGIN DEBUG: User ID:", user.id)
        console.log("LOGIN DEBUG: tableMode value:", user.tableMode)

        // Strict check for null OR undefined
        if (user.tableMode === null || user.tableMode === undefined) {
            console.log("LOGIN DEBUG: Redirecting to SETUP")
            redirect("/setup/mode?verified=true")
        } else if (user.tableMode === true) {
            console.log("LOGIN DEBUG: Redirecting to TABLES")
            redirect("/dashboard/tables?verified=true")
        } else {
            console.log("LOGIN DEBUG: Redirecting to DASHBOARD (Counter)")
            redirect("/dashboard?verified=true")
        }

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

        console.log("CREATE PIN DEBUG: tableMode value:", user.tableMode)

        if (user.tableMode === null || user.tableMode === undefined) {
            redirect("/setup/mode?verified=true")
        } else if (user.tableMode === true) {
            redirect("/dashboard/tables?verified=true")
        } else {
            redirect("/dashboard?verified=true")
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        return { error: "Failed to set PIN" }
    }
}
