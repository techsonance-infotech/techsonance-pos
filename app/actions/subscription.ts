'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from 'uuid'

// Mock In-Memory Store for pending payments (Use DB in real prod)
// We will use a simple map for MVP since server actions are stateless, 
// we'll rely on passing data via URL params mostly, or create a temporary "LicenseRequest" in DB.
// Actually, we have `LicenseRequest` model in schema! Let's use it.

export async function initiatePayment(planType: 'PRO' | 'ENTERPRISE', amount: number, billingCycle: 'ANNUAL' | 'PERPETUAL') {
    const user = await getUserProfile()
    if (!user?.companyId) return { error: "Unauthorized" }

    try {
        const request = await prisma.licenseRequest.create({
            data: {
                companyId: user.companyId,
                requestedById: user.id,
                planType: billingCycle, // Schema uses 'ANNUAL' or 'PERPETUAL'
                planPrice: amount,
            }
        })

        // Determine Redirect URL
        const gatewayUrl = process.env.PAYMENT_GATEWAY_URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const callbackUrl = `${appUrl}/license-expired?paymentId=${request.id}&status=success`

        if (gatewayUrl) {
            // External Gateway (e.g. your custom page or a hosted checkout)
            // We append params so the external page knows what to charge and where to return
            const redirectUrl = `${gatewayUrl}?orderId=${request.id}&amount=${amount}&ref=${request.planType}&callbackUrl=${encodeURIComponent(callbackUrl)}`
            return { redirectUrl }
        } else {
            // Internal Mock Gateway
            return { redirectUrl: `/payment-gateway?id=${request.id}&amount=${amount}` }
        }

    } catch (error) {
        console.error("Initiate Payment Error", error)
        return { error: "Failed to initiate payment" }
    }
}

export async function verifyPaymentAndActivate(paymentId: string) {
    const user = await getUserProfile()
    if (!user?.companyId) return { error: "Unauthorized" }

    try {
        const request = await prisma.licenseRequest.findUnique({ where: { id: paymentId } })

        if (!request || request.status === 'COMPLETED') {
            return { error: "Invalid payment request" }
        }

        // Generate License Key
        const randomSegment = uuidv4().split('-')[0].toUpperCase()
        const year = new Date().getFullYear()
        const licenseKey = `SYNC-${request.planType.substring(0, 3)}-${randomSegment}-${year}`.toUpperCase()

        // Create License
        const license = await prisma.license.create({
            data: {
                key: licenseKey,
                companyId: user.companyId,
                type: request.planType,
                status: 'ACTIVE',
                validUntil: request.planType === 'ANNUAL'
                    ? new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    : null
            }
        })

        // Update Request
        await prisma.licenseRequest.update({
            where: { id: paymentId },
            data: {
                status: 'COMPLETED',
                licenseKey: licenseKey,
                paymentVerifiedAt: new Date()
            }
        })

        // Activate Company
        await prisma.company.update({
            where: { id: user.companyId },
            data: { isActive: true }
        })

        // Mock Email
        console.log(`[EMAIL MOCK] Sending License Key ${licenseKey} to user ${user.email}`)

        return { success: true, licenseKey }

    } catch (error) {
        console.error("Activation Error", error)
        return { error: "Failed to activate license" }
    }
}

export async function manualActivate(key: string) {
    const user = await getUserProfile()
    if (!user?.companyId) return { error: "Unauthorized" }

    try {
        // 1. Check if key exists and is available
        // In this MVP, checking "available" is tricky if we don't pre-generate keys.
        // But let's assume if it exists in License table linked to THIS company, it's valid.
        // OR if we support "Retail Keys" (bought offline), they would be in DB without companyId?
        // Schema: `companyId` is required in `License` model.
        // So Manual Entry mainly works if the license was ALREADY provisioned for them by Admin.

        const license = await prisma.license.findUnique({
            where: { companyId: user.companyId } // Actually schema has companyId @unique
        })

        if (license && license.key === key.trim()) {
            // Already assigned, just ensure active
            await prisma.company.update({
                where: { id: user.companyId },
                data: { isActive: true }
            })
            return { success: true }
        }

        return { error: "Invalid license key (Ensure it matches the one sent to your email)" }

    } catch (error) {
        return { error: "Validation failed" }
    }
}
