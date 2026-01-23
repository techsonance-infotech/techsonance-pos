'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "@/app/actions/user"
import { revalidatePath } from "next/cache"

// Pricing plans (internal constant, not exported since 'use server' can only export async functions)
const LICENSE_PLANS = {
    ANNUAL: { type: 'ANNUAL', price: 4999, label: 'Annual License', description: '1 Year Access' },
    PERPETUAL: { type: 'PERPETUAL', price: 9999, label: 'Perpetual License', description: 'Lifetime Access' }
}

/**
 * Create a new license request
 */
export async function createLicenseRequest(planType: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }
    if (!user.companyId) return { error: "No company associated with account" }

    // Only Business Owners can request licenses
    if (user.role !== 'BUSINESS_OWNER') {
        return { error: "Only Business Owners can request licenses. Please contact your Business Owner." }
    }

    const plan = LICENSE_PLANS[planType as keyof typeof LICENSE_PLANS]
    if (!plan) return { error: "Invalid plan type" }

    // Check if there's already a pending request
    const existing = await prisma.licenseRequest.findFirst({
        where: {
            companyId: user.companyId,
            status: { notIn: ['COMPLETED', 'REJECTED'] }
        }
    })

    if (existing) {
        return { error: "You already have an active license request.", existingId: existing.id }
    }

    try {
        const request = await prisma.licenseRequest.create({
            data: {
                companyId: user.companyId,
                requestedById: user.id,
                planType: plan.type,
                planPrice: plan.price,
                status: 'PENDING'
            }
        })

        // Create initial message
        await prisma.licenseRequestMessage.create({
            data: {
                requestId: request.id,
                senderId: user.id,
                content: `I would like to purchase the ${plan.label} (₹${plan.price.toLocaleString()}).`,
                isAdminMessage: false
            }
        })

        revalidatePath('/dashboard')
        return { success: true, requestId: request.id }
    } catch (e) {
        console.error("Failed to create license request:", e)
        return { error: "Failed to create request" }
    }
}

/**
 * Get user's current license request
 */
export async function getMyLicenseRequest() {
    const user = await getUserProfile()
    if (!user || !user.companyId) return null

    return await prisma.licenseRequest.findFirst({
        where: {
            companyId: user.companyId,
            status: { notIn: ['COMPLETED', 'REJECTED'] }
        },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                include: {
                    sender: {
                        select: { id: true, username: true, role: true }
                    }
                }
            },
            company: {
                select: { name: true }
            },
            requestedBy: {
                select: { username: true, email: true }
            }
        }
    })
}

/**
 * Get all license requests (Admin only)
 */
export async function getAllLicenseRequests() {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    return await prisma.licenseRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            company: {
                select: { id: true, name: true, slug: true }
            },
            requestedBy: {
                select: { id: true, username: true, email: true }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    })
}

/**
 * Get a specific license request with messages (Admin only)
 */
export async function getLicenseRequestById(requestId: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }

    const request = await prisma.licenseRequest.findUnique({
        where: { id: requestId },
        include: {
            company: {
                select: { id: true, name: true, slug: true }
            },
            requestedBy: {
                select: { id: true, username: true, email: true }
            },
            messages: {
                orderBy: { createdAt: 'asc' },
                include: {
                    sender: {
                        select: { id: true, username: true, role: true }
                    }
                }
            }
        }
    })

    if (!request) return { error: "Request not found" }

    // Users can only view their own company's requests
    if (user.role !== 'SUPER_ADMIN' && request.companyId !== user.companyId) {
        return { error: "Unauthorized" }
    }

    return request
}

/**
 * Send a message in the license request chat
 */
export async function sendLicenseRequestMessage(requestId: string, content: string, attachmentUrl?: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }

    const request = await prisma.licenseRequest.findUnique({
        where: { id: requestId }
    })

    if (!request) return { error: "Request not found" }

    // Users can only message their own company's requests
    if (user.role !== 'SUPER_ADMIN' && request.companyId !== user.companyId) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.licenseRequestMessage.create({
            data: {
                requestId,
                senderId: user.id,
                content,
                attachmentUrl,
                isAdminMessage: user.role === 'SUPER_ADMIN'
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/admin/license-requests')
        return { success: true }
    } catch (e) {
        return { error: "Failed to send message" }
    }
}

/**
 * Upload payment screenshot
 */
export async function uploadPaymentScreenshot(requestId: string, screenshotUrl: string) {
    const user = await getUserProfile()
    if (!user || !user.companyId) return { error: "Not authenticated" }

    const request = await prisma.licenseRequest.findUnique({
        where: { id: requestId }
    })

    if (!request) return { error: "Request not found" }
    if (request.companyId !== user.companyId) return { error: "Unauthorized" }

    try {
        await prisma.licenseRequest.update({
            where: { id: requestId },
            data: {
                paymentScreenshot: screenshotUrl,
                status: 'PAYMENT_UPLOADED'
            }
        })

        // Add message about screenshot upload
        await prisma.licenseRequestMessage.create({
            data: {
                requestId,
                senderId: user.id,
                content: "I have uploaded the payment screenshot. Please verify.",
                attachmentUrl: screenshotUrl,
                isAdminMessage: false
            }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (e) {
        return { error: "Failed to upload screenshot" }
    }
}

/**
 * Admin: Update request status
 */
export async function updateLicenseRequestStatus(requestId: string, status: string, message?: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.licenseRequest.update({
            where: { id: requestId },
            data: { status: status as any }
        })

        if (message) {
            await prisma.licenseRequestMessage.create({
                data: {
                    requestId,
                    senderId: user.id,
                    content: message,
                    isAdminMessage: true
                }
            })
        }

        revalidatePath('/dashboard/admin/license-requests')
        return { success: true }
    } catch (e) {
        return { error: "Failed to update status" }
    }
}

/**
 * Admin: Verify payment and send license key
 */
export async function verifyPaymentAndSendKey(requestId: string, licenseKey: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.licenseRequest.update({
            where: { id: requestId },
            data: {
                status: 'COMPLETED',
                licenseKey,
                paymentVerifiedAt: new Date()
            }
        })

        await prisma.licenseRequestMessage.create({
            data: {
                requestId,
                senderId: user.id,
                content: `✅ Payment verified! Your license key is: **${licenseKey}**\n\nPlease copy this key and use the "Activate License" button to activate your license.`,
                isAdminMessage: true
            }
        })

        revalidatePath('/dashboard/admin/license-requests')
        return { success: true }
    } catch (e) {
        return { error: "Failed to verify payment" }
    }
}

/**
 * Get chat stats for admin badge
 */
export async function getPendingLicenseRequestsCount() {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') return 0

    return await prisma.licenseRequest.count({
        where: {
            status: { in: ['PENDING', 'PAYMENT_UPLOADED'] }
        }
    })
}
