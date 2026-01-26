'use server'

import { prisma } from "@/lib/prisma"
import bcrypt from 'bcryptjs'


import { generateVerificationToken, hashToken } from "@/app/actions/verify-email"
import { sendVerificationEmail, sendNewRegistrationAdminNotification } from "@/lib/email"
import { logAudit } from "@/lib/audit"

const TOKEN_EXPIRY_MINUTES = 30

export async function registerUser(prevState: any, formData: FormData) {
    const businessName = formData.get("businessName") as string
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const contactNo = formData.get("contactNo") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Basic required field validation
    if (!businessName || !username || !email || !password || !confirmPassword) {
        return { error: "All fields are required" }
    }

    // Business Name validation
    if (businessName.trim().length < 3) {
        return { error: "Business Name must be at least 3 characters" }
    }

    // Username validation (alphanumeric and underscore only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
        return { error: "Username must be 3-20 characters and contain only letters, numbers, and underscores" }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: "Invalid email address" }
    }

    // Contact number validation (exactly 10 digits, numbers only)
    if (contactNo) {
        const phoneRegex = /^\d{10}$/
        if (!phoneRegex.test(contactNo)) {
            return { error: "Contact number must be exactly 10 digits (numbers only)" }
        }
    }

    // Password strength validation
    // Must have: 1 uppercase, 1 lowercase, 1 number, 1 special character, min 8 chars
    if (password.length < 8) {
        return { error: "Password must be at least 8 characters long" }
    }
    if (!/[A-Z]/.test(password)) {
        return { error: "Password must contain at least 1 uppercase letter" }
    }
    if (!/[a-z]/.test(password)) {
        return { error: "Password must contain at least 1 lowercase letter" }
    }
    if (!/[0-9]/.test(password)) {
        return { error: "Password must contain at least 1 number" }
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { error: "Password must contain at least 1 special character (!@#$%^&*)" }
    }

    // Confirm password validation
    if (password !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    try {
        // Combined check for existing username or email (1 DB call instead of 2)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        })

        if (existingUser) {
            if (existingUser.username === username) {
                return { error: "Username already exists. Please choose a different one." }
            }
            if (existingUser.email === email) {
                return { error: "Email already registered. Please use a different email." }
            }
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate verification token
        const token = await generateVerificationToken()
        const hashedToken = await hashToken(token)
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

        // Generate slug from business name or username + random
        const baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`

        // Create User, Company, and Store in a transaction
        await prisma.$transaction(async (tx: any) => {
            // 1. Create Default Company
            const company = await tx.company.create({
                data: {
                    name: businessName,
                    slug: slug,
                    isActive: true
                }
            })

            // 2. Create Default Store
            const store = await tx.store.create({
                data: {
                    name: 'Main Outlet',
                    location: 'Main Location',
                    companyId: company.id,
                    tableMode: true
                }
            })

            // 3. Create User linked to Company and Store
            await tx.user.create({
                data: {
                    username,
                    email,
                    contactNo: contactNo || null,
                    password: hashedPassword,
                    role: 'BUSINESS_OWNER', // upgraded to owner since they are creating the tenant
                    companyId: company.id,
                    defaultStoreId: store.id,
                    stores: {
                        connect: { id: store.id }
                    },
                    isApproved: false, // Wait for email verification
                    isLocked: false,
                    isVerified: false,
                    verificationToken: hashedToken,
                    verificationExpiresAt: expiresAt
                }
            })

            // 4. Create Default Super Admin for this company
            const adminEmail = `${slug}@techsonance.co.in`
            const adminUsername = `${slug}_admin`
            const defaultAdminPassword = 'TechSonance1711!@#$'
            const hashedAdminPassword = await bcrypt.hash(defaultAdminPassword, 10)

            await tx.user.create({
                data: {
                    username: adminUsername,
                    email: adminEmail,
                    password: hashedAdminPassword,
                    role: 'SUPER_ADMIN',
                    companyId: company.id,
                    defaultStoreId: store.id,
                    stores: {
                        connect: { id: store.id }
                    },
                    isApproved: true, // Auto-approve admin
                    isLocked: false,
                    isVerified: true // Auto-verify admin
                }
            })
        })

        // Non-blocking side effects (Fire & Forget)
        // 1. Send verification email
        sendVerificationEmail(email, token).catch(e => console.error("Failed to send verification email:", e))

        // 2. Send admin notification
        sendNewRegistrationAdminNotification({
            businessName,
            username,
            email,
            contactNo: contactNo || null
        }).catch(err => console.error('Admin notification failed:', err))

        // 3. Log Audit
        logAudit({
            action: 'CREATE',
            module: 'AUTH',
            entityType: 'Company',
            entityId: businessName,
            userId: 'SYSTEM_REGISTRATION',
            reason: `New Company Registration: ${businessName} (${email})`,
            severity: 'HIGH'
        }).catch(err => console.error('Audit log failed:', err))

        console.log(`Registration successful for ${businessName} (${email})`)
        return { success: true, message: "Registration successful! Please check your email to verify your account." }

    } catch (error) {
        console.error("Registration error:", error)

        // Log failed registration attempt (Async)
        logAudit({
            action: 'CREATE',
            module: 'AUTH',
            entityType: 'Company',
            entityId: businessName,
            userId: 'SYSTEM_REGISTRATION',
            reason: `Registration Failed: ${businessName} (${email}) - ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'HIGH'
        }).catch(e => console.error('Failed to log failure audit:', e))

        return { error: "Something went wrong. Please try again." }
    }
}

