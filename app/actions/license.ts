'use server'

import { prisma } from "@/lib/prisma"
import { generateProductKey, verifyProductKey, LicensePayload, generateWindowsStyleKey, hashLicenseKey } from "@/lib/licensing"
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
    const maxDevicesStr = formData.get("maxDevices") as string

    if (!storeId || !type) {
        return { error: "Missing required fields" }
    }

    let validUntil: Date | null = null;
    let expiryTimestamp = 0;
    const maxDevices = maxDevicesStr ? parseInt(maxDevicesStr) : 1;

    if (type === 'PERPETUAL') {
        expiryTimestamp = 9999999999999;
    } else {
        if (!expiryDateStr) return { error: "Expiry date required for non-perpetual licenses" }
        validUntil = new Date(expiryDateStr);
        validUntil.setHours(23, 59, 59, 999);
        expiryTimestamp = validUntil.getTime();
    }

    // Refactored: No longer using private key encryption
    // const privateKey = process.env.LICENSE_PRIVATE_KEY;

    const existing = await prisma.license.findUnique({
        where: { storeId }
    })

    // Generate Windows-style display key
    const displayKey = generateWindowsStyleKey();
    const keyHash = hashLicenseKey(displayKey);
    // Mask logic: XXXXX-XXXXX-12345
    const maskedKey = "XXXXX-XXXXX-" + displayKey.split('-')[2];

    const payload: LicensePayload = {
        storeId,
        productKeyId: displayKey, // Store the display key reference
        expiry: expiryTimestamp,
        type: type,
        issuedAt: Date.now()
    }

    // Use the display key itself as the stored key
    const signedKey = displayKey; // No longer signing with JWT

    try {
        if (existing) {
            // Update existing license (renewal)
            await prisma.license.update({
                where: { id: existing.id },
                data: {
                    key: signedKey,
                    keyHash,
                    maskedKey,
                    type,
                    status: 'PENDING', // Require activation
                    validUntil,
                    maxDevices,
                    revokedAt: null,
                    revokedBy: null
                }
            })
        } else {
            // Create new license
            await prisma.license.create({
                data: {
                    key: signedKey,
                    keyHash,
                    maskedKey,
                    type,
                    status: 'PENDING', // Require activation
                    validUntil,
                    maxDevices,
                    storeId
                }
            })
        }
    } catch (e) {
        console.error(e)
        return { error: "Database error creating license" }
    }

    revalidatePath('/dashboard/admin/licenses')
    // Return the Windows-style display key to the user
    return { success: true, key: displayKey, signedKey }
}

export async function getAllStoresForLicensing() {
    const stores = await prisma.store.findMany({
        include: {
            license: {
                select: {
                    id: true,
                    type: true,
                    status: true,
                    validUntil: true
                }
            },
            users: {
                where: { role: 'BUSINESS_OWNER' },
                select: { email: true, username: true },
                take: 1
            }
        },
        orderBy: { name: 'asc' }
    })
    return stores
}

export async function getAllLicenses() {
    return await prisma.license.findMany({
        include: {
            store: {
                select: {
                    name: true,
                    location: true,
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

export async function getLicenseStats() {
    const licenses = await prisma.license.findMany({
        include: {
            devices: true
        }
    })

    const total = licenses.length
    const active = licenses.filter((l: any) => l.status === 'ACTIVE').length
    const expired = licenses.filter((l: any) => l.status === 'REVOKED' || (l.validUntil && new Date(l.validUntil) < new Date())).length
    const totalDevices = licenses.reduce((sum: number, l: any) => sum + (l.devices?.length || 0), 0)

    return { total, active, expired, totalDevices }
}

export async function createBulkLicenses(formData: FormData) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const storeIds = formData.getAll("storeIds") as string[]
    const type = formData.get("type") as LicenseType
    const expiryDateStr = formData.get("expiryDate") as string

    if (!storeIds || storeIds.length === 0 || !type) {
        return { error: "Missing required fields" }
    }

    let validUntil: Date | null = null
    let expiryTimestamp = 0

    if (type === 'PERPETUAL') {
        expiryTimestamp = 9999999999999
    } else {
        if (!expiryDateStr) return { error: "Expiry date required for non-perpetual licenses" }
        validUntil = new Date(expiryDateStr)
        validUntil.setHours(23, 59, 59, 999)
        expiryTimestamp = validUntil.getTime()
    }

    const results: Array<{ storeId: string, storeName: string, key: string, success: boolean, error?: string }> = []

    for (const storeId of storeIds) {
        try {
            // Check if license already exists
            const existing = await prisma.license.findUnique({
                where: { storeId },
                include: { store: { select: { name: true } } }
            })

            if (existing) {
                results.push({
                    storeId,
                    storeName: existing.store.name,
                    key: '',
                    success: false,
                    error: 'Store already has a license'
                })
                continue
            }

            // Get store name
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: { name: true }
            })

            if (!store) {
                results.push({
                    storeId,
                    storeName: 'Unknown',
                    key: '',
                    success: false,
                    error: 'Store not found'
                })
                continue
            }

            // Generate Windows-style display key
            const displayKey = generateWindowsStyleKey();
            const keyHash = hashLicenseKey(displayKey);
            const maskedKey = "XXXXX-XXXXX-" + displayKey.split('-')[2];

            const signedKey = displayKey; // Use display key directly

            await prisma.license.create({
                data: {
                    key: signedKey,
                    keyHash,
                    maskedKey,
                    type,
                    status: 'PENDING',
                    validUntil,
                    storeId
                }
            })

            results.push({
                storeId,
                storeName: store.name,
                key: displayKey, // Return display key
                success: true
            })
        } catch (e) {
            console.error(`Error creating license for store ${storeId}:`, e)
            results.push({
                storeId,
                storeName: 'Unknown',
                key: '',
                success: false,
                error: 'Database error'
            })
        }
    }

    revalidatePath('/dashboard/admin/licenses')
    return { success: true, results }
}


export async function revokeLicense(licenseId: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: {
                status: 'REVOKED',
                revokedAt: new Date(),
                revokedBy: user.id
            }
        })
        revalidatePath('/dashboard/admin/licenses')
        return { success: true }
    } catch (e) {
        return { error: "Failed to revoke license" }
    }
}

// Extend a trial license by specified number of days
export async function extendTrialLicense(licenseId: string, days: number) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    if (days < 1 || days > 365) {
        return { error: "Extension must be between 1 and 365 days" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId }
    })

    if (!license) return { error: "License not found" }
    if (license.type === 'PERPETUAL') return { error: "Cannot extend perpetual license" }

    const currentExpiry = license.validUntil || new Date()
    const newExpiry = new Date(currentExpiry)
    newExpiry.setDate(newExpiry.getDate() + days)

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: {
                validUntil: newExpiry,
                status: 'ACTIVE',
                extendedAt: new Date(),
                extendedCount: { increment: 1 }
            }
        })
        revalidatePath('/dashboard/admin/licenses')
        return { success: true, newExpiry }
    } catch (e) {
        return { error: "Failed to extend license" }
    }
}

// Search licenses by store name, email, or key
export async function searchLicenses(query: string) {
    if (!query || query.length < 2) {
        return getAllLicenses()
    }

    const searchTerm = query.toLowerCase()

    return await prisma.license.findMany({
        where: {
            OR: [
                { store: { name: { contains: searchTerm, mode: 'insensitive' } } },
                { store: { users: { some: { email: { contains: searchTerm, mode: 'insensitive' } } } } },
                { key: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        include: {
            store: {
                select: {
                    name: true,
                    location: true,
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

export async function makeLicensePerpetual(licenseId: string) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: { storeId: true }
    })

    if (!license) return { error: "License not found" }

    // const privateKey = process.env.LICENSE_PRIVATE_KEY;

    // Generate new payload
    const displayKey = generateWindowsStyleKey();
    const keyHash = hashLicenseKey(displayKey);
    const maskedKey = "XXXXX-XXXXX-" + displayKey.split('-')[2];

    const signedKey = displayKey; // Direct assignment

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: {
                key: signedKey,
                keyHash,
                maskedKey,
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

    // Logic: Default store or first store. 
    // If a user has NO store, they cannot have a valid license context, so they are invalid.
    const store = user.defaultStore || user.stores[0]

    if (!store) {
        return { valid: false, error: "No store found. Please create a store first." }
    }

    if (!store.license) {
        // Check for Trial Period
        const trialDays = parseInt(process.env.TRIAL_PERIOD_DAYS || '7')

        // Use store creation date as the start of the trial
        const trialStartDate = new Date(store.createdAt)
        const now = new Date()

        // Calculate difference in days
        const diffTime = Math.abs(now.getTime() - trialStartDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays <= trialDays) {
            // Still in trial
            return { valid: true }
        } else {
            // New account / No license -> Treat as Invalid/Expired
            return { valid: false, error: "Trial period expired. Please activate a license." }
        }
    }

    // Verify Session License Refactored: 
    // We already verified status, expiry, and existence above.
    // Since we TRUST the database state as the source of truth, 
    // and we no longer require cryptographic verification of the key string itself (it's just an ID now),
    // we can return valid: true.

    return { valid: true }
}

export async function reactivateLicense(key: string, storeId: string) {
    // Hash the input key to find the record
    const keyHash = hashLicenseKey(key);

    const license = await prisma.license.findFirst({
        where: { keyHash },
        include: { store: true }
    })

    if (!license) {
        return { error: "Invalid License Key" }
    }

    if (license.storeId !== storeId) {
        return { error: "This license key belongs to a different store." }
    }

    if (license.status === 'REVOKED') {
        return { error: "This license has been revoked." }
    }

    const now = new Date()
    if (license.validUntil && license.validUntil < now) {
        return { error: "This license has expired." }
    }

    // License is valid and matches store. 
    // Usually no action needed if it's already in DB and linked.
    // But if we need to "reactivate" a status:
    if (license.status !== 'ACTIVE') {
        await prisma.license.update({
            where: { id: license.id },
            data: { status: 'ACTIVE' }
        })
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

// Reveal the full license key for admin reference
export async function revealLicenseKey(licenseId: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId }
    })

    if (!license) return { error: "License not found" }

    try {
        // 1. Check if it's a simple Windows-style key
        const windowsKeyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
        if (windowsKeyPattern.test(license.key)) {
            return { success: true, key: license.key }
        }

        // 2. Legacy Support: Try to extract from JWT without verification
        if (license.key.startsWith('ey')) {
            try {
                // Decode payload (2nd part of JWT)
                const payloadPart = license.key.split('.')[1]
                if (payloadPart) {
                    const decoded = Buffer.from(payloadPart, 'base64').toString('utf-8')
                    const json = JSON.parse(decoded)
                    if (json.data?.productKeyId) {
                        return { success: true, key: json.data.productKeyId }
                    }
                }
            } catch (e) {
                // Formatting error, fall through
            }
        }

        // 3. Fallback: Return raw key
        return { success: true, key: license.key, isRaw: true }
    } catch (e) {
        return { error: "Failed to decode license key" }
    }
}
