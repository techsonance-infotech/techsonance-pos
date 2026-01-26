'use server'

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import bcrypt from 'bcryptjs'
import { logAudit } from "@/lib/audit"

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
    const identifier = (formData.get("identifier") as string).trim()
    const password = formData.get("password") as string
    const keepLoggedIn = formData.get("keep_logged_in") === "on" // Checkbox value

    if (!identifier || !password) {
        return { error: "Please enter both username/email and password" }
    }

    try {
        // 0. Extract IP first (needed for security check)
        let ip = "unknown"
        try {
            const { headers } = await import("next/headers")
            const headerList = await headers()
            ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip") || "unknown"
            if (ip === "::1") ip = "127.0.0.1"
        } catch (e) {
            console.error("Failed to get IP:", e)
        }

        // 1. Parallel Lookup: User & Blocked IP (Reduces latency by running DB queries concurrently)
        const [user, blockedIp] = await Promise.all([
            prisma.user.findFirst({
                where: {
                    OR: [
                        { username: identifier },
                        { email: identifier }
                    ]
                },
                include: {
                    company: true // Fetch company details to check status
                }
            }),
            prisma.securityRule.findFirst({
                where: {
                    type: 'IP',
                    value: ip
                }
            })
        ])

        // 2. Security Check (Fail fast)
        if (blockedIp) {
            return { error: `Access denied. Your IP (${ip}) has been blocked by the administrator.` }
        }

        if (!user) {
            return { error: "Invalid credentials" }
        }

        // Check password - support both hashed (new/reset) and plain text (legacy)
        let isValidPassword = false
        let needsMigration = false

        // 1. Try bcrypt verification first (for reset passwords and new registrations)
        // Check if stored password looks like a bcrypt hash (starts with $2)
        if (user.password.startsWith('$2')) {
            try {
                isValidPassword = await bcrypt.compare(password, user.password)
            } catch (e) {
                console.error("Bcrypt compare failed:", e)
            }
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
            // Await this as it's critical for security
            try {
                const hashedPassword = await bcrypt.hash(password, 10)
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                })
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

        // Check if account is disabled/locked
        if (user.isLocked) {
            return { error: "Your account has been disabled by the administrator." }
        }

        // Check if Company is Active (for multi-tenant users)
        if (user.companyId && user.company && !user.company.isActive) {
            return { error: "Your company account has been deactivated. Please contact support." }
        }

        // Async Non-blocking Side Effects
        // 1. Update Last IP
        prisma.user.update({
            where: { id: user.id },
            data: { lastIp: ip }
        }).catch((err: any) => console.error("Failed to update Last IP:", err))

        // 2. Log Login Audit
        logAudit({
            action: 'LOGIN',
            module: 'AUTH',
            entityType: 'User',
            entityId: user.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: 'User logged in successfully',
            severity: 'LOW'
        }).catch((err: any) => console.error("Failed to log login audit:", err))


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
    const userId = cookieStore.get('session_user_id')?.value

    // Log Logout
    if (userId) {
        // We try to fetch user to fill details, or just log ID
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } })
            if (user) {
                await logAudit({
                    action: 'LOGOUT',
                    module: 'AUTH',
                    entityType: 'User',
                    entityId: user.id,
                    userId: user.id,
                    userRoleId: user.role,
                    tenantId: user.companyId || undefined,
                    storeId: user.defaultStoreId || undefined,
                    reason: 'User logged out',
                    severity: 'LOW'
                }).catch((err: any) => console.error("Failed to log logout audit:", err))
            }
        } catch (e) {
            // Ignore fetch error logging out
        }
    }

    // Clear session cookies
    cookieStore.delete('session_user_id')
    cookieStore.delete('persistent_session')
    cookieStore.delete('current_user_id')

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
