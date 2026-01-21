'use server'

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import bcrypt from 'bcryptjs'

/**
 * Login action with "Keep me logged in" support
 * 
 * If keepLoggedIn is checked:
 *   - Sets a persistent cookie (30 days)
 *   - User stays logged in even after closing browser
 * 
 * If keepLoggedIn is NOT checked:
 *   - Sets a session cookie (no maxAge)
 *   - User is logged out when browser is closed
 */
export async function login(prevState: any, formData: FormData) {
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string
    const keepLoggedIn = formData.get("keep_logged_in") === "on" // Checkbox value

    if (!identifier || !password) {
        return { error: "Please enter both username/email and password" }
    }

    try {
        // Find user by username or email
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

        // Check password - support both hashed (new/reset) and plain text (legacy)
        let isValidPassword = false
        let needsMigration = false

        // 1. Try bcrypt verification first (for reset passwords and new registrations)
        // Check if stored password looks like a bcrypt hash (starts with $2a$ or $2b$)
        if (user.password.startsWith('$2') && user.password.length === 60) {
            isValidPassword = await bcrypt.compare(password, user.password)
        }

        // 2. If it's not a hash or bcrypt failed (check plain text fallback)
        if (!isValidPassword) {
            // Fallback: Check plain text (for legacy users)
            if (user.password === password) {
                isValidPassword = true
                needsMigration = true
            }
        }

        if (!isValidPassword) {
            return { error: "Invalid credentials" }
        }

        // Migrate legacy plain text password to bcrypt hash
        if (needsMigration) {
            try {
                const hashedPassword = await bcrypt.hash(password, 10)
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                })
                console.log(`Migrated user ${user.id} password to bcrypt hash`)
            } catch (e) {
                console.error("Failed to migrate password:", e)
            }
        }

        // Check if user is approved
        if (!user.isApproved) {
            return { error: "Your account is pending approval. Please contact the administrator." }
        }

        // Check if email is verified
        if (!user.isVerified) {
            return { error: "Please verify your email address before logging in." }
        }

        // Capture Last IP for audit purposes
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

        // Set session cookie based on "Keep me logged in" preference
        const cookieStore = await cookies()

        // Cookie options
        const cookieOptions: {
            path: string
            sameSite: 'lax' | 'strict' | 'none'
            secure: boolean
            httpOnly: boolean
            maxAge?: number
        } = {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true
        }

        // If "Keep me logged in" is checked, set persistent cookie (30 days)
        // Otherwise, set session cookie (expires when browser closes)
        if (keepLoggedIn) {
            const thirtyDays = 30 * 24 * 60 * 60 // 30 days in seconds
            cookieOptions.maxAge = thirtyDays
            console.log(`User ${user.id} logged in with "Keep me logged in" enabled. Persistent cookie set (30 days).`)
        } else {
            // No maxAge = session cookie (expires when browser closes)
            console.log(`User ${user.id} logged in without "Keep me logged in". Session cookie set.`)
        }

        // Set the session cookie
        cookieStore.set('session_user_id', user.id, cookieOptions)

        // Also store a flag to indicate if this is a persistent session
        cookieStore.set('persistent_session', keepLoggedIn ? 'true' : 'false', cookieOptions)

        // Check if user has a PIN
        if (user.pin) {
            redirect(`/pin?uid=${user.id}`)
        } else {
            redirect(`/pin?create=true&uid=${user.id}`)
        }

        // Note: Code after redirect is unreachable.
    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        console.error("Login error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}

/**
 * Logout action
 * Clears all session cookies and redirects to login page
 */
export async function logout() {
    const cookieStore = await cookies()

    // Clear session cookies
    cookieStore.delete('session_user_id')
    cookieStore.delete('persistent_session')
    cookieStore.delete('current_user_id')

    console.log("User logged out. All session cookies cleared.")

    redirect('/')
}

/**
 * Check if user is logged in
 * Returns user ID if logged in, null otherwise
 */
export async function isLoggedIn(): Promise<string | null> {
    const cookieStore = await cookies()
    const sessionUserId = cookieStore.get('session_user_id')?.value

    return sessionUserId || null
}

/**
 * Check if current session is persistent (Keep me logged in was checked)
 */
export async function isPersistentSession(): Promise<boolean> {
    const cookieStore = await cookies()
    const persistent = cookieStore.get('persistent_session')?.value

    return persistent === 'true'
}
