'use server'

import { prisma } from "@/lib/prisma"
import { sendPasswordResetOTP, sendPasswordResetSuccess } from "@/lib/email"
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Rate limiting: Max 3 OTP requests per email in 10 minutes
const OTP_RATE_LIMIT = 3
const OTP_RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes

// OTP settings
const OTP_EXPIRY_MINUTES = 5
const MAX_OTP_ATTEMPTS = 5
const RESET_TOKEN_EXPIRY_MINUTES = 10

/**
 * Generate a 6-digit numeric OTP
 */
function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString()
}

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a string using bcrypt
 */
async function hashString(str: string): Promise<string> {
    return bcrypt.hash(str, 10)
}

/**
 * Verify a string against a bcrypt hash
 */
async function verifyHash(str: string, hash: string): Promise<boolean> {
    return bcrypt.compare(str, hash)
}

/**
 * Step 1: Send OTP to email
 * - Validates email exists in database
 * - Generates 6-digit OTP
 * - Sends OTP via email
 * - Stores hashed OTP in database
 */
export async function sendForgotPasswordOTP(
    prevState: any,
    formData: FormData
): Promise<{ success?: boolean; error?: string; message?: string }> {
    const email = formData.get('email') as string

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Please enter a valid email address" }
    }

    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            // For security, don't reveal if email exists or not
            // But for UX, we'll show a specific error
            return { error: "Email not registered. Please check and try again." }
        }

        // Rate limiting: Check recent OTP requests
        const recentOTPs = await prisma.passwordResetOtp.count({
            where: {
                email: email.toLowerCase(),
                createdAt: {
                    gte: new Date(Date.now() - OTP_RATE_LIMIT_WINDOW)
                }
            }
        })

        if (recentOTPs >= OTP_RATE_LIMIT) {
            return {
                error: "Too many OTP requests. Please wait 10 minutes before trying again."
            }
        }

        // Invalidate any existing unused OTPs for this email
        await prisma.passwordResetOtp.updateMany({
            where: {
                email: email.toLowerCase(),
                isUsed: false
            },
            data: {
                isUsed: true
            }
        })

        // Generate new OTP
        const otp = generateOTP()
        const otpHash = await hashString(otp)
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        // Store OTP in database
        await prisma.passwordResetOtp.create({
            data: {
                email: email.toLowerCase(),
                otpHash,
                expiresAt,
                isUsed: false,
                attempts: 0
            }
        })

        // Send OTP email
        const emailSent = await sendPasswordResetOTP(email, otp, OTP_EXPIRY_MINUTES)

        if (!emailSent) {
            return { error: "Failed to send OTP email. Please try again." }
        }

        console.log(`OTP sent to ${email}: ${otp}`) // Remove in production!

        return {
            success: true,
            message: "OTP sent successfully! Please check your email."
        }

    } catch (error) {
        console.error("Send OTP error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}

/**
 * Step 2: Verify OTP
 * - Validates OTP against stored hash
 * - Checks expiry and attempt limits
 * - Returns reset token on success
 */
export async function verifyForgotPasswordOTP(
    prevState: any,
    formData: FormData
): Promise<{ success?: boolean; error?: string; message?: string; resetToken?: string }> {
    const email = formData.get('email') as string
    const otp = formData.get('otp') as string

    if (!email || !otp) {
        return { error: "Email and OTP are required" }
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
        return { error: "Invalid OTP format. Please enter 6 digits." }
    }

    try {
        // Find the latest unused OTP for this email
        const otpRecord = await prisma.passwordResetOtp.findFirst({
            where: {
                email: email.toLowerCase(),
                isUsed: false
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!otpRecord) {
            return { error: "No OTP found. Please request a new one." }
        }

        // Check if OTP has expired
        if (new Date() > otpRecord.expiresAt) {
            return { error: "OTP has expired. Please request a new one." }
        }

        // Check attempt limit
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await prisma.passwordResetOtp.update({
                where: { id: otpRecord.id },
                data: { isUsed: true }
            })
            return { error: "Maximum attempts exceeded. Please request a new OTP." }
        }

        // Verify OTP
        const isValid = await verifyHash(otp, otpRecord.otpHash)

        if (!isValid) {
            // Increment attempts
            await prisma.passwordResetOtp.update({
                where: { id: otpRecord.id },
                data: { attempts: otpRecord.attempts + 1 }
            })

            const remainingAttempts = MAX_OTP_ATTEMPTS - otpRecord.attempts - 1
            return {
                error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
            }
        }

        // OTP is valid - generate reset token
        const resetToken = generateResetToken()
        const resetTokenHash = await hashString(resetToken)

        // Update OTP record with reset token
        await prisma.passwordResetOtp.update({
            where: { id: otpRecord.id },
            data: {
                resetToken: resetTokenHash,
                // Extend expiry for password reset step
                expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000)
            }
        })

        return {
            success: true,
            message: "OTP verified successfully!",
            resetToken
        }

    } catch (error) {
        console.error("Verify OTP error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}

/**
 * Step 3: Reset Password
 * - Validates reset token
 * - Updates user password
 * - Marks OTP as used
 */
export async function resetPassword(
    prevState: any,
    formData: FormData
): Promise<{ success?: boolean; error?: string; message?: string }> {
    const email = formData.get('email') as string
    const resetToken = formData.get('resetToken') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Validate inputs
    if (!email || !resetToken || !newPassword || !confirmPassword) {
        return { error: "All fields are required" }
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
    if (!passwordRegex.test(newPassword)) {
        return {
            error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
        }
    }

    try {
        // Find the OTP record with reset token
        const otpRecord = await prisma.passwordResetOtp.findFirst({
            where: {
                email: email.toLowerCase(),
                isUsed: false,
                resetToken: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!otpRecord || !otpRecord.resetToken) {
            return { error: "Invalid or expired reset session. Please start over." }
        }

        // Check if reset token has expired
        if (new Date() > otpRecord.expiresAt) {
            return { error: "Reset session has expired. Please start over." }
        }

        // Verify reset token
        const isValidToken = await verifyHash(resetToken, otpRecord.resetToken)

        if (!isValidToken) {
            return { error: "Invalid reset token. Please start over." }
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            return { error: "User not found" }
        }

        // Hash new password
        const hashedPassword = await hashString(newPassword)

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        })

        // Mark OTP as used
        await prisma.passwordResetOtp.update({
            where: { id: otpRecord.id },
            data: { isUsed: true }
        })

        // Send success email
        await sendPasswordResetSuccess(email)

        console.log(`Password reset successful for ${email}`)

        return {
            success: true,
            message: "Password updated successfully! You can now login with your new password."
        }

    } catch (error) {
        console.error("Reset password error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}

/**
 * Resend OTP - wrapper for sendForgotPasswordOTP
 */
export async function resendOTP(
    prevState: any,
    formData: FormData
): Promise<{ success?: boolean; error?: string; message?: string }> {
    return sendForgotPasswordOTP(prevState, formData)
}
