'use server'

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import bcrypt from 'bcryptjs'

export async function verifyPin(prevState: any, formData: FormData) {
    const pin = formData.get("pin") as string
    const userId = formData.get("userId") as string

    if (!pin || !userId) {
        return { error: "Missing PIN or User ID" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { defaultStore: true }
        })

        if (!user) {
            redirect("/")
        }

        if (!user.pin) {
            return { error: "PIN not set" }
        }

        let isValid = false
        let needsMigration = false

        // Check if PIN is hashed (bcrypt hashes start with $2a$, $2y$, or $2b$)
        if (user.pin.startsWith('$2')) {
            isValid = await bcrypt.compare(pin, user.pin)
        } else {
            // Legacy plain text check
            if (user.pin === pin) {
                isValid = true
                needsMigration = true
            }
        }

        if (!isValid) {
            return { error: "Invalid PIN" }
        }

        // Migrate to hashed PIN if needed
        if (needsMigration) {
            // console.log(`Migrating PIN for user ${user.username} to hashed format`)
            const hashedPin = await bcrypt.hash(pin, 10)
            await prisma.user.update({
                where: { id: user.id },
                data: { pin: hashedPin }
            })
        }

        // Set session cookie
        const cookieStore = await cookies()

        // Set session cookie
        cookieStore.set('session_role', user.role)
        cookieStore.set('session_user_id', user.id)

        // Async Audit Log
        const { logAudit } = await import("@/lib/audit")
        logAudit({
            action: 'LOGIN',
            module: 'AUTH',
            entityType: 'User',
            entityId: user.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: 'User verified PIN',
            severity: 'LOW'
        }).catch((err: any) => console.error("Failed to log PIN verification:", err))

        // Redirect based on Default Store Mode
        if (user.defaultStore?.tableMode === false) {
            redirect("/dashboard/new-order?verified=true")
        } else {
            redirect("/dashboard/tables?verified=true")
        }

    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        console.error("PIN verification error:", error)
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

    if (pin.length !== 4) {
        return { error: "PIN must be exactly 4 digits" }
    }

    if (!/^\d+$/.test(pin)) {
        return { error: "PIN must contain only numbers" }
    }

    try {
        // Hash PIN before storing
        const hashedPin = await bcrypt.hash(pin, 10)

        const user = await prisma.user.update({
            where: { id: userId },
            data: { pin: hashedPin },
            include: { defaultStore: true }
        })

        // Set session cookie
        const cookieStore = await cookies()
        cookieStore.set('session_role', user.role)
        cookieStore.set('session_user_id', user.id)

        // Async Audit Log
        const { logAudit } = await import("@/lib/audit")
        logAudit({
            action: 'UPDATE',
            module: 'AUTH',
            entityType: 'User',
            entityId: user.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId || undefined,
            reason: 'User created/updated PIN',
            severity: 'MEDIUM'
        }).catch((err: any) => console.error("Failed to log PIN creation:", err))

        if (user.defaultStore?.tableMode === false) {
            redirect("/dashboard/new-order?verified=true")
        } else {
            redirect("/dashboard/tables?verified=true")
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
        }
        console.error("Set PIN error:", error)
        return { error: "Failed to set PIN" }
    }
}
