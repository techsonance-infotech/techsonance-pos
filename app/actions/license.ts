'use server'

import { prisma } from "@/lib/prisma"
import { generateWindowsStyleKey, hashLicenseKey } from "@/lib/licensing"
import { revalidatePath } from "next/cache"
import { LicenseType } from "@/types/enums"
import { getUserProfile } from "@/app/actions/user"

// Check if user is Super Admin
async function checkSuperAdmin() {
    const user = await getUserProfile()
    return user?.role === 'SUPER_ADMIN'
}

/**
 * Create or renew a license for a Company
 */
export async function createLicense(formData: FormData) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const companyId = formData.get("companyId") as string
    const type = formData.get("type") as LicenseType
    const expiryDateStr = formData.get("expiryDate") as string
    const maxDevicesStr = formData.get("maxDevices") as string

    if (!companyId || !type) {
        return { error: "Missing required fields" }
    }

    let validUntil: Date | null = null
    const maxDevices = maxDevicesStr ? parseInt(maxDevicesStr) : 1

    // Fetch company to get joined date (createdAt)
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { createdAt: true }
    })

    if (!company) return { error: "Company not found" }

    if (type === 'PERPETUAL') {
        // No expiry for perpetual
    } else if (type === 'ANNUAL') {
        // 1 Year from Company Creation Date
        validUntil = new Date(company.createdAt)
        validUntil.setFullYear(validUntil.getFullYear() + 1)
        validUntil.setHours(23, 59, 59, 999)
    } else if (type === 'TRIAL') {
        const trialDaysStr = formData.get("trialDays") as string
        if (!trialDaysStr) return { error: "Number of days required for trial" }

        const days = parseInt(trialDaysStr)
        if (isNaN(days) || days < 1) return { error: "Invalid trial days" }

        // Days from Company Creation Date
        validUntil = new Date(company.createdAt)
        validUntil.setDate(validUntil.getDate() + days)
        validUntil.setHours(23, 59, 59, 999)
    }

    // Check for existing active license
    const existing = await prisma.license.findUnique({
        where: { companyId }
    })

    if (existing) {
        const now = new Date()
        const isExpired = existing.validUntil && existing.validUntil < now
        const isRevoked = existing.status === 'REVOKED'

        // Requirements: "should not be able to create the new licence key... until the current expiry date is passed"
        // So if it's NOT expired and NOT revoked, we block it.
        // Even if status is 'PENDING', it counts as an active slot being used until it expires or is revoked.
        if (!isExpired && !isRevoked && existing.type !== 'PERPETUAL') {
            return { error: "Company already has an active license that has not expired." }
        }

        // Perpetual licenses effectively never expire, so block if one exists
        if (existing.type === 'PERPETUAL' && !isRevoked) {
            return { error: "Company already has a Perpetual license." }
        }
    }

    // Validate Expiry is not in the past
    if (validUntil && validUntil < new Date()) {
        return { error: "Calculated expiry date is in the past. Please check Company Joined Date." }
    }

    // Generate Windows-style display key
    const displayKey = generateWindowsStyleKey()
    const keyHash = hashLicenseKey(displayKey)
    const maskedKey = "XXXXX-XXXXX-" + displayKey.split('-')[2]

    try {
        if (existing) {
            // Update existing license (renewal)
            await prisma.license.update({
                where: { id: existing.id },
                data: {
                    key: displayKey,
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
                    key: displayKey,
                    keyHash,
                    maskedKey,
                    type,
                    status: 'PENDING',
                    validUntil,
                    maxDevices,
                    companyId
                }
            })
        }
    } catch (e) {
        console.error(e)
        return { error: "Database error creating license" }
    }

    revalidatePath('/dashboard/admin/licenses')
    return { success: true, key: displayKey }
}

/**
 * Get all companies for licensing dropdown
 */
export async function getAllCompaniesForLicensing() {
    const companies = await prisma.company.findMany({
        include: {
            license: {
                select: {
                    id: true,
                    type: true,
                    status: true,
                    validUntil: true,
                    maskedKey: true
                }
            },
            users: {
                where: { role: 'BUSINESS_OWNER' },
                select: { email: true, username: true },
                take: 1
            },
            _count: {
                select: { stores: true, users: true }
            }
        },
        orderBy: { name: 'asc' }
    })
    return companies
}

/**
 * Get all licenses with company info
 */
export async function getAllLicenses() {
    return await prisma.license.findMany({
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    users: {
                        where: { role: { not: 'SUPER_ADMIN' } },
                        select: { email: true, username: true, role: true }
                    },
                    _count: {
                        select: { stores: true }
                    }
                }
            },
            devices: true
        },
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Get license statistics
 */
export async function getLicenseStats() {
    const licenses = await prisma.license.findMany()

    const total = licenses.length
    const active = licenses.filter((l: any) => l.status === 'ACTIVE').length
    const expired = licenses.filter((l: any) =>
        l.status === 'REVOKED' || (l.validUntil && new Date(l.validUntil) < new Date())
    ).length

    // Calculate total users in licensed companies (excluding Super Admin) - effectively "Licensed Users/Devices"
    const licensedCompanyIds = licenses.map((l: any) => l.companyId)
    const totalDevices = await prisma.user.count({
        where: {
            companyId: { in: licensedCompanyIds },
            role: { not: 'SUPER_ADMIN' }
        }
    })

    return { total, active, expired, totalDevices }
}

/**
 * Revoke a license
 */
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

/**
 * Extend a trial/annual license
 */
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

/**
 * Convert a license to perpetual
 */
export async function makeLicensePerpetual(licenseId: string) {
    if (!await checkSuperAdmin()) {
        return { error: "Unauthorized" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId }
    })

    if (!license) return { error: "License not found" }

    const displayKey = generateWindowsStyleKey()
    const keyHash = hashLicenseKey(displayKey)
    const maskedKey = "XXXXX-XXXXX-" + displayKey.split('-')[2]

    try {
        await prisma.license.update({
            where: { id: licenseId },
            data: {
                key: displayKey,
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
    return { success: true, key: displayKey }
}

/**
 * Verify session license for a user
 * Checks the user's company license status
 */
export async function verifySessionLicense(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            company: {
                include: { license: true }
            }
        }
    })

    if (!user) return { valid: false, error: "User not found" }

    // Super Admin always has access
    if (user.role === 'SUPER_ADMIN') return { valid: true }

    // User must belong to a company
    if (!user.company) {
        return { valid: false, error: "No company found. Please contact support." }
    }

    const company = user.company

    // Check if company has an active license
    if (!company.license) {
        // No license - check trial period
        const trialDays = parseInt(process.env.TRIAL_PERIOD_DAYS || '7')
        const trialStartDate = new Date(company.createdAt)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - trialStartDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays <= trialDays) {
            // Still in trial
            return {
                valid: true,
                isTrial: true,
                daysRemaining: trialDays - diffDays + 1,
                trialEndsAt: new Date(trialStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
            }
        } else {
            return { valid: false, error: "Trial period expired. Please activate a license." }
        }
    }

    const license = company.license

    // Check license status
    if (license.status === 'REVOKED') {
        return { valid: false, error: "License has been revoked. Please contact support." }
    }

    if (license.status === 'PENDING') {
        return { valid: false, error: "License is pending activation. Please enter your product key." }
    }

    // Check expiry for non-perpetual licenses
    if (license.validUntil && new Date(license.validUntil) < new Date()) {
        return { valid: false, error: "License has expired. Please renew your license." }
    }

    return { valid: true, license }
}

/**
 * Get current user's license status (for client-side display)
 */
export async function getMyLicenseStatus() {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }

    return await verifySessionLicense(user.id)
}

/**
 * Activate a license with a product key
 */
export async function activateLicense(key: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }

    if (!user.companyId) {
        return { error: "No company associated with your account" }
    }

    // Hash the input key to find the record
    const keyHash = hashLicenseKey(key)

    const license = await prisma.license.findFirst({
        where: { keyHash },
        include: { company: true }
    })

    if (!license) {
        return { error: "Invalid License Key" }
    }

    if (license.companyId !== user.companyId) {
        return { error: "This license key belongs to a different company." }
    }

    if (license.status === 'REVOKED') {
        return { error: "This license has been revoked." }
    }

    const now = new Date()
    if (license.validUntil && license.validUntil < now) {
        return { error: "This license has expired." }
    }

    // Activate the license
    if (license.status !== 'ACTIVE') {
        await prisma.license.update({
            where: { id: license.id },
            data: { status: 'ACTIVE' }
        })
    }

    revalidatePath('/dashboard')
    return { success: true, message: "License activated successfully!" }
}

/**
 * Reveal the full license key (Super Admin only)
 */
export async function revealLicenseKey(licenseId: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const license = await prisma.license.findUnique({
        where: { id: licenseId }
    })

    if (!license) return { error: "License not found" }

    return { success: true, key: license.key }
}

/**
 * Search licenses
 */
export async function searchLicenses(query: string) {
    if (!query || query.length < 2) {
        return getAllLicenses()
    }

    const searchTerm = query.toLowerCase()

    return await prisma.license.findMany({
        where: {
            OR: [
                { company: { name: { contains: searchTerm, mode: 'insensitive' } } },
                { company: { slug: { contains: searchTerm, mode: 'insensitive' } } },
                { company: { users: { some: { email: { contains: searchTerm, mode: 'insensitive' } } } } },
                { maskedKey: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    users: {
                        where: { role: { not: 'SUPER_ADMIN' } },
                        select: { email: true, username: true, role: true }
                    },
                    _count: {
                        select: { stores: true }
                    }
                }
            },
            devices: true
        },
        orderBy: { createdAt: 'desc' }
    })
}
