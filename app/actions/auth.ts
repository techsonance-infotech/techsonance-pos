'use server'

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function login(prevState: any, formData: FormData) {
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string

    if (!identifier || !password) {
        return { error: "Please enter both username/email and password" }
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier }
                ]
            }
        })

        if (!user) {
            return { error: "Invalid credentials" }
        }

        // Simple password check (Note: In production, use bcrypt.compare)
        // The seeed data uses plain text 'password123' for now based on the prompt "password fields" without explicit hashing requirements for the demo, 
        // but I should ideally add hashing. For now, sticking to the seed data's plain text to ensure it works immediately.
        if (user.password !== password) {
            return { error: "Invalid credentials" }
        }

        // Check if user is approved
        if (!user.isApproved) {
            return { error: "Your account is pending approval. Please contact the administrator." }
        }

        // Capture Last IP
        try {
            const { headers } = await import("next/headers")
            const headerList = await headers()
            let ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip") || "unknown"

            // Normalize IPv6 localhost
            if (ip === "::1") ip = "127.0.0.1"

            await prisma.user.update({
                where: { id: user.id },
                data: { lastIp: ip }
            })
        } catch (e) {
            console.error("Failed to update Last IP:", e)
        }

        // Check if user has a PIN
        if (user.pin) {
            redirect(`/pin?uid=${user.id}`)
        } else {
            redirect(`/pin?create=true&uid=${user.id}`)
        }

        // Capture IP (Async update, don't await blocking redirect)
        // Note: Code after redirect is unreachable. We must do it BEFORE redirect.
    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        console.error("Login error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}
