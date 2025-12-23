'use server'

import { prisma } from "@/lib/prisma"

export async function registerUser(prevState: any, formData: FormData) {
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const contactNo = formData.get("contactNo") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Validation
    if (!username || !email || !password || !confirmPassword) {
        return { error: "All fields are required" }
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters" }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: "Invalid email address" }
    }

    try {
        // Check for existing username
        const existingUsername = await prisma.user.findUnique({
            where: { username }
        })

        if (existingUsername) {
            return { error: "Username already exists" }
        }

        // Check for existing email
        const existingEmail = await prisma.user.findUnique({
            where: { email }
        })

        if (existingEmail) {
            return { error: "Email already registered" }
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
