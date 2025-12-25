'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { getUserProfile } from "./user"

// Check for Super Admin or Business Owner access
async function checkAdmin() {
    const user = await getUserProfile()
    return user?.role === 'SUPER_ADMIN' || user?.role === 'BUSINESS_OWNER'
}

export async function createUser(data: any) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    const { username, email, password, role, contactNo } = data

    // Basic validation
    if (!username || !email || !password) {
        return { error: "Missing required fields" }
    }

    try {
        // Check existence
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        })

        if (existing) {
            return { error: "Username or Email already exists" }
        }

        await prisma.user.create({
            data: {
                username,
                email,
                password, // Note: In production, hash this!
                role: role as Role || 'USER',
                contactNo,
                isApproved: true, // Admin created users are auto-approved
                isLocked: false
            }
        })

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e: any) {
        console.error("Create User Error:", e)
        return { error: e.message || "Failed to create user" }
    }
}

export async function updateUser(userId: string, data: any) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    const { username, email, role, contactNo } = data

    try {
        // Check if email/username changes conflict with others
        const existing = await prisma.user.findFirst({
            where: {
                AND: [
                    { id: { not: userId } },
                    {
                        OR: [
                            { username },
                            { email }
                        ]
                    }
                ]
            }
        })

        if (existing) {
            return { error: "Username or Email already in use by another user" }
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                email,
                role: role as Role,
                contactNo
            }
        })

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e: any) {
        return { error: "Failed to update user" }
    }
}

export async function deleteUser(userId: string) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    // Hard delete or Soft delete?
    // Requirement: "if deleted the status should be disabled so that they cannt login"
    // This implies Soft Delete / Lock.
    // We already have isLocked. We will reuse that but maybe rename action to "Disable Account" or implement explicit Delete logic if needed.
    // Let's implement it as "Locking" to ensure they can't login, effectively disabling them.

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isLocked: true }
        })
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e) {
        return { error: "Failed to disable user" }
    }
}

export async function enableUser(userId: string) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isLocked: false }
        })
        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/settings/staff')
        return { success: true }
    } catch (e) {
        return { error: "Failed to enable user" }
    }
}

export async function resetPassword(userId: string, newPassword: string) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    if (!newPassword || newPassword.length < 6) return { error: "Password must be at least 6 chars" }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword } // Hash in production
        })
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e) {
        return { error: "Failed to reset password" }
    }
}
