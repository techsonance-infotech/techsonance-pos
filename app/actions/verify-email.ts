'use server'

import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import crypto from 'crypto'

// Rate limiting for resend
const RESEND_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes
const RESEND_LIMIT_COUNT = 3
const TOKEN_EXPIRY_MINUTES = 30

/**
 * Generate a secure random token
 */
export async function generateVerificationToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a string using SHA256 (fast and secure for tokens)
 */
export async function hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify Email Action
 * URL-based verification
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
        return { success: false, message: "Invalid verification link." }
    }

    try {
        const hashedToken = await hashToken(token)

        // Find user with this token
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: hashedToken,
                verificationExpiresAt: {
                    gt: new Date() // Check not expired
                }
            }
        })

        if (!user) {
            return { success: false, message: "Invalid or expired verification link." }
        }

        // Verify user and auto-approve
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                isApproved: true, // Auto-approve upon email verification
                verificationToken: null,
                verificationExpiresAt: null
            }
        })

        console.log(`User ${user.email} verified successfully.`)
        return { success: true, message: "Email verified successfully. You can now login." }

    } catch (error) {
        console.error("Verification error:", error)
        return { success: false, message: "Something went wrong. Please try again." }
    }
}

/**
 * Resend Verification Email Action
 */
export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) {
        return { success: false, message: "Email address is required." }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            // For security, fake success
            return { success: true, message: "If this email is registered, we have sent a verification link." }
        }

        if (user.isVerified) {
            return { success: true, message: "Email is already verified. Please login." }
        }

        // Rate limiting logic - simplistic approach (can be improved with dedicated redis/table)
        // For now relying on token expiry update frequency
        const cooldown = new Date(Date.now() + (TOKEN_EXPIRY_MINUTES - 1) * 60 * 1000)
        // If the current token is still very fresh (sent less than 1 min ago), deny
        // This is a rough heuristic
        if (user.verificationExpiresAt && user.verificationExpiresAt.getTime() > cooldown.getTime()) {
            return { success: false, message: "Please wait a moment before requesting another email." }
        }

        // Generate new token
        const token = await generateVerificationToken()
        const hashedToken = await hashToken(token)
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: hashedToken,
                verificationExpiresAt: expiresAt
            }
        })

        // Send email
        await sendVerificationEmail(email, token)

        return { success: true, message: "Verification email sent. Please check your inbox." }

    } catch (error) {
        console.error("Resend verification error:", error)
        return { success: false, message: "Something went wrong. Please try again." }
    }
}
