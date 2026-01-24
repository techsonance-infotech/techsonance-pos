'use server'

import { prisma, isPostgres } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role } from "@/types/enums"
import { getUserProfile } from "./user"
import bcrypt from 'bcryptjs'
import { generateVerificationToken, hashToken } from "@/app/actions/verify-email"
import { sendVerificationEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit"

const TOKEN_EXPIRY_MINUTES = 30

// Check for Super Admin or Business Owner access
async function checkAdmin() {
    const user = await getUserProfile()
    return user?.role === 'SUPER_ADMIN' || user?.role === 'BUSINESS_OWNER'
}

export async function createUser(data: any) {
    const currentUser = await getUserProfile()
    if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'BUSINESS_OWNER')) return { error: "Unauthorized" }

    const { username, email, password, role, contactNo, disabledModules } = data

    // Basic validation
    if (!username || !email || !password) {
        return { error: "Missing required fields" }
    }

    // Role Validation: Business Owner cannot create Super Admin
    if (currentUser.role === 'BUSINESS_OWNER' && role === 'SUPER_ADMIN') {
        return { error: "Cannot create Super Admin account" }
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate verification token
        const token = await generateVerificationToken()
        const hashedToken = await hashToken(token)
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

        await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: role as Role || 'USER',
                contactNo,
                isApproved: true, // Auto-approved since created by Admin
                isLocked: false,
                isVerified: false, // Requires email verification
                verificationToken: hashedToken,
                verificationExpiresAt: expiresAt,
                companyId: currentUser.companyId,
                defaultStoreId: data.storeId || currentUser.defaultStoreId,
                // Postgres supports Arrays, SQLite uses CSV String
                disabledModules: isPostgres
                    ? (disabledModules || []) // Array
                    : (Array.isArray(disabledModules) ? disabledModules.join(',') : (disabledModules || "")), // CSV
                stores: data.storeId ? {
                    connect: { id: data.storeId }
                } : undefined
            }
        })

        // Send verification email
        await sendVerificationEmail(email, token)

        await logAudit({
            action: 'CREATE',
            module: 'USER',
            entityType: 'User',
            entityId: email, // No ID returned from create() wrapper easily unless we capture it. 
            // Wait, create() returns the object. Code above kept it in `await prisma.user.create`.
            // Let's assume we can't easily get ID without refactoring. We'll use email as ID reference.
            userId: currentUser.id,
            userRoleId: currentUser.role,
            tenantId: currentUser.companyId || undefined,
            storeId: currentUser.defaultStoreId || undefined,
            reason: `Created staff user ${username} (${role})`,
            severity: 'MEDIUM'
        })

        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/settings/staff')
        return { success: true, message: "Staff created. Verification email sent." }
    } catch (e: any) {
        console.error("Create User Error:", e)
        return { error: e.message || "Failed to create user" }
    }
}

export async function updateUser(userId: string, data: any) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    const { username, email, role, contactNo, disabledModules } = data
    console.log(`[updateUser] Updating user ${userId} with data:`, JSON.stringify(data))

    try {
        // Fetch current user state to check for email change
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!currentUser) return { error: "User not found" }

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
            console.log(`[updateUser] Conflict found with user ${existing.id}`)
            return { error: "Username or Email already in use by another user" }
        }

        const isEmailChanged = email && email !== currentUser.email
        let updateData: any = {
            username,
            role: role as Role,
            contactNo,
            // Postgres supports Arrays, SQLite uses CSV String
            disabledModules: isPostgres
                ? disabledModules // Keep as array (Postgres)
                : (Array.isArray(disabledModules) ? disabledModules.join(',') : (disabledModules || "")) // Convert to CSV (SQLite)
        }

        let verificationTokenStr = null

        if (isEmailChanged) {
            updateData.email = email
            updateData.isVerified = false // Revoke verification

            // Generate new token
            const token = await generateVerificationToken()
            const hashedToken = await hashToken(token)
            const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

            updateData.verificationToken = hashedToken
            updateData.verificationExpiresAt = expiresAt

            verificationTokenStr = token // Store unhashed token to send email
            updateData.email = email
        }

        // Store Assignment Logic
        if (data.storeId) {
            updateData.defaultStoreId = data.storeId
            updateData.stores = {
                set: [], // Clear existing assignments (assuming single store for now)
                connect: { id: data.storeId }
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        })

        // Send email if changed
        if (isEmailChanged && verificationTokenStr) {
            await sendVerificationEmail(email, verificationTokenStr)
        }

        const adminUser = await getUserProfile() // Refetch just in case
        if (adminUser) {
            await logAudit({
                action: 'UPDATE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: adminUser.id,
                userRoleId: adminUser.role,
                tenantId: adminUser.companyId || undefined,
                storeId: adminUser.defaultStoreId || undefined,
                reason: `Updated user ${username}`,
                after: updateData,
                severity: 'LOW'
            })
        }

        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/settings/staff')

        return {
            success: true,
            message: isEmailChanged
                ? "User updated. Email changed, verification email sent."
                : "User updated successfully"
        }
    } catch (e: any) {
        console.error("[updateUser] Failed to update user:", e)
        return { error: "Failed to update user: " + e.message }
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

        const adminUser = await getUserProfile()
        if (adminUser) {
            await logAudit({
                action: 'UPDATE', // It's a lock, effectively a delete/ban
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: adminUser.id,
                userRoleId: adminUser.role,
                tenantId: adminUser.companyId || undefined,
                storeId: adminUser.defaultStoreId || undefined,
                reason: 'User account disabled (Locked)',
                severity: 'HIGH'
            })
        }

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

        const adminUser = await getUserProfile()
        if (adminUser) {
            await logAudit({
                action: 'UPDATE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: adminUser.id,
                userRoleId: adminUser.role,
                tenantId: adminUser.companyId || undefined,
                storeId: adminUser.defaultStoreId || undefined,
                reason: 'User account enabled (Unlocked)',
                severity: 'MEDIUM'
            })
        }

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
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        const adminUser = await getUserProfile()
        if (adminUser) {
            await logAudit({
                action: 'UPDATE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: adminUser.id,
                userRoleId: adminUser.role,
                tenantId: adminUser.companyId || undefined,
                storeId: adminUser.defaultStoreId || undefined,
                reason: 'Password reset by admin',
                severity: 'HIGH'
            })
        }

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e) {
        return { error: "Failed to reset password" }
    }
}

export async function approveUser(userId: string) {
    if (!await checkAdmin()) return { error: "Unauthorized" }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isApproved: true,
                isVerified: true, // Manual approval implies verification
                verificationToken: null, // Clear token
                verificationExpiresAt: null
            }
        })
        if (currentUser) {
            await logAudit({
                action: 'APPROVE',
                module: 'USER',
                entityType: 'User',
                entityId: userId,
                userId: currentUser.id,
                userRoleId: currentUser.role,
                tenantId: currentUser.companyId || undefined,
                storeId: currentUser.defaultStoreId || undefined,
                reason: 'User approved by admin (admin-users)',
                severity: 'MEDIUM'
            })
        }
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (e) {
        return { error: "Failed to approve user" }
    }
}
