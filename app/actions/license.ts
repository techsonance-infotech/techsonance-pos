'use server'

import { prisma } from "@/lib/prisma"
import { generateProductKey, LicensePayload } from "@/lib/licensing"
import { revalidatePath } from "next/cache"
import { LicenseType } from "@prisma/client"
import { getUserProfile } from "@/app/actions/user"

// TODO: stricter role check
async function checkSuperAdmin() {
    // In a real app, verify the session/user role here.
    return true;
}

export async function createLicense(formData: FormData) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const storeId = formData.get("storeId") as string
    const type = formData.get("type") as LicenseType
    const expiryDateStr = formData.get("expiryDate") as string // YYYY-MM-DD

    if (!storeId || !type) {
        return { error: "Missing required fields" }
    }

    let validUntil: Date | null = null;
    let expiryTimestamp = 0;

    if (type === 'PERPETUAL') {
        expiryTimestamp = 9999999999999;
    } else {
        if (!expiryDateStr) return { error: "Expiry date required for non-perpetual licenses" }
        validUntil = new Date(expiryDateStr);
        validUntil.setHours(23, 59, 59, 999);
        expiryTimestamp = validUntil.getTime();
    }

    const privateKey = process.env.LICENSE_PRIVATE_KEY;
    if (!privateKey) {
        return { error: "Server configuration error: Missing Private Key" }
    }

    const existing = await prisma.license.findUnique({
        where: { storeId }
    })

    if (existing) {
        return { error: "Store already has a license. Revoke or update it first." }
    }

    const payload: LicensePayload = {
        storeId,
        productKeyId: "",
        expiry: expiryTimestamp,
        type: type,
        issuedAt: Date.now()
    }

    const signedKey = generateProductKey(payload, privateKey);

    try {
        await prisma.license.create({
            data: {
                key: signedKey,
                type,
                status: 'ACTIVE',
                validUntil,
                storeId
            }
        })
    } catch (e) {
        console.error(e)
        return { error: "Database error creating license" }
    }

    revalidatePath('/dashboard/admin/licenses')
    return { success: true, key: signedKey }
}

export async function getStoresWithoutLicense() {
    const stores = await prisma.store.findMany({
        where: {
            license: null
        },
        select: {
            id: true,
            name: true,
            location: true,
            users: {
                where: { role: 'BUSINESS_OWNER' },
                select: { email: true, username: true },
                take: 1
            }
        }
    })
    return stores
}

export async function getAllLicenses() {
    return await prisma.license.findMany({
        include: {
            store: {
                select: {
                    name: true,
                    users: {
                        where: { role: 'BUSINESS_OWNER' },
                        select: { email: true, username: true },
                        take: 1
                    }
                }
            },
            devices: true
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function revokeLicense(licenseId: string) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: { status: 'REVOKED' }
        })
        revalidatePath('/dashboard/admin/licenses')
        return { success: true }
    } catch (e) {
        return { error: "Failed to revoke license" }
    }
}

export async function makeLicensePerpetual(licenseId: string) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: { storeId: true }
    })

    if (!license) return { error: "License not found" }

    const privateKey = process.env.LICENSE_PRIVATE_KEY;
    if (!privateKey) {
        return { error: "Server configuration error" }
    }

    // Generate new payload
    const payload: LicensePayload = {
        storeId: license.storeId,
        productKeyId: "",
        expiry: 9999999999999,
        type: 'PERPETUAL',
        issuedAt: Date.now()
    }

    const signedKey = generateProductKey(payload, privateKey);

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: {
                key: signedKey,
                type: 'PERPETUAL',
                status: 'ACTIVE',
                validUntil: null,
            }
        })
    } catch (e) {
        return { error: "Database error updating license" }
    }

    revalidatePath('/dashboard/admin/licenses')
    return { success: true }
}

export async function verifySessionLicense(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            stores: {
                include: { license: true }
            },
            defaultStore: {
                include: { license: true }
            }
        }
    })

    if (!user) return { valid: false, error: "User not found" }

    if (user.role === 'SUPER_ADMIN') return { valid: true }

    // Logic: Default store or first store
    const store = user.defaultStore || user.stores[0]

    if (!store) {
        return { valid: true }
    }

    if (!store.license) {
        return { valid: false, error: "No license found" }
    }

    const publicKey = process.env.NEXT_PUBLIC_LICENSE_KEY
    if (!publicKey) return { valid: false, error: "System Error: Missing Public Key" }

    // Verify License Status from DB (Revocation Check)
    if (store.license.status === 'REVOKED') {
        return { valid: false, error: "License has been revoked" }
    }

    const { verifyProductKey } = await import("@/lib/licensing")

    // Check locally first (Offline capability)
    const result = verifyProductKey(store.license.key, publicKey)

    return result
}

export async function reactivateLicense(key: string, storeId: string) {
    const publicKey = process.env.NEXT_PUBLIC_LICENSE_KEY
    if (!publicKey) return { error: "System Error" }

    const { verifyProductKey } = await import("@/lib/licensing")
    const verification = verifyProductKey(key, publicKey)

    if (!verification.valid || !verification.payload) {
        return { error: "Invalid License Key" }
    }

    if (verification.payload.storeId && verification.payload.storeId !== storeId) {
        return { error: "This license key belongs to a different store." }
    }

    try {
        await prisma.license.upsert({
            where: { storeId },
            create: {
                key,
                type: verification.payload.type,
                status: 'ACTIVE',
                validUntil: verification.payload.type === 'PERPETUAL' ? null : new Date(verification.payload.expiry),
                storeId
            },
            update: {
                key,
                type: verification.payload.type,
                status: 'ACTIVE',
                validUntil: verification.payload.type === 'PERPETUAL' ? null : new Date(verification.payload.expiry),
            }
        })
    } catch (e) {
        return { error: "Failed to activate license" }
    }

    return { success: true }
}

/**
 * Wrapper for the current user's session store
 */
export async function reactivateMyStoreLicense(key: string) {
    try {
        const user = await getUserProfile()
        if (!user) return { error: "Unauthenticated" }

        const userWithStores = await prisma.user.findUnique({
            where: { id: user.id },
            include: { stores: true, defaultStore: true }
        })

        if (!userWithStores) return { error: "User not found" }

        const store = userWithStores.defaultStore || userWithStores.stores[0]
        if (!store) return { error: "No store associated with account" }

        return await reactivateLicense(key, store.id)
    } catch (e) {
        return { error: "Failed to resolve user session" }
    }
}
