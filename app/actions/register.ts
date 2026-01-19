'use server'

import { prisma } from "@/lib/prisma"

export async function registerUser(prevState: any, formData: FormData) {
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const contactNo = formData.get("contactNo") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Basic required field validation
    if (!username || !email || !password || !confirmPassword) {
        return { error: "All fields are required" }
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
        // Check for existing username
        const existingUsername = await prisma.user.findUnique({
            where: { username }
        })

        if (existingUsername) {
            return { error: "Username already exists. Please choose a different one." }
        }

        // Check for existing email
        const existingEmail = await prisma.user.findUnique({
            where: { email }
        })

        if (existingEmail) {
            return { error: "Email already registered. Please use a different email." }
        }

        // Create user with isApproved: false
        await prisma.user.create({
            data: {
                username,
                email,
                contactNo: contactNo || null,
                password, // Note: In production, hash this password
                role: 'USER',
                isApproved: false,
                isLocked: false
            }
        })

        return { success: true, message: "Registration successful! Please wait for admin approval." }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}
