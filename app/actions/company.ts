'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { isSuperAdmin } from "@/lib/tenant"

export type CompanyFormData = {
    name: string
    slug: string
    logo?: string
    address?: string
    phone?: string
    email?: string
}

/**
 * Get all companies (Super Admin only)
 */
export async function getCompanies() {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: {
                        stores: true,
                        users: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        return { success: true, companies }
    } catch (error) {
        console.error("Error fetching companies:", error)
        return { error: "Failed to fetch companies" }
    }
}

/**
 * Get a single company by ID
 */
export async function getCompany(companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                stores: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        tableMode: true,
                        _count: {
                            select: {
                                orders: true,
                                users: true
                            }
                        }
                    }
                },
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        stores: true,
                        users: true
                    }
                }
            }
        })

        if (!company) {
            return { error: "Company not found" }
        }

        return { success: true, company }
    } catch (error) {
        console.error("Error fetching company:", error)
        return { error: "Failed to fetch company" }
    }
}

/**
 * Create a new company (Super Admin only)
 * Also creates a default Business Owner admin account for the company
 */
export async function createCompany(data: CompanyFormData) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    // Validate required fields
    if (!data.name || !data.slug) {
        return { error: "Name and slug are required" }
    }

    // Validate slug format (lowercase, no spaces, URL-friendly)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(data.slug)) {
        return { error: "Slug must be lowercase with only letters, numbers, and hyphens" }
    }

    try {
        // Check if slug is unique
        const existingCompany = await prisma.company.findUnique({
            where: { slug: data.slug }
        })

        if (existingCompany) {
            return { error: "A company with this slug already exists" }
        }

        // Generate admin credentials based on company slug
        const adminEmail = `${data.slug}@techsonance.co.in`
        const adminUsername = `${data.slug}_admin`
        const defaultPassword = 'TechSonance1711!@#$'

        // Check if admin email already exists
        const existingAdmin = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: adminEmail },
                    { username: adminUsername }
                ]
            }
        })

        if (existingAdmin) {
            return { error: `Admin account ${adminEmail} or username ${adminUsername} already exists` }
        }

        // Hash the default password
        const { hash } = await import('bcryptjs')
        const hashedPassword = await hash(defaultPassword, 10)

        // Create company and admin in a transaction
        const result = await prisma.$transaction(async (tx: typeof prisma) => {
            // Create company
            const company = await tx.company.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    logo: data.logo || null,
                    address: data.address || null,
                    phone: data.phone || null,
                    email: data.email || null
                }
            })

            // Create default store for this company
            const defaultStore = await tx.store.create({
                data: {
                    name: `${data.name} - Main Store`,
                    location: data.address || 'Default Location',
                    companyId: company.id,
                    tableMode: true
                }
            })

            // Create default Super Admin for this company with store access
            const adminUser = await tx.user.create({
                data: {
                    username: adminUsername,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isApproved: true,
                    companyId: company.id,
                    defaultStoreId: defaultStore.id,
                    stores: {
                        connect: { id: defaultStore.id }
                    }
                }
            })

            return { company, adminUser, defaultStore }
        })

        revalidatePath('/dashboard/admin/companies')
        revalidatePath('/dashboard/stores')
        return {
            success: true,
            company: result.company,
            adminCredentials: {
                email: adminEmail,
                username: adminUsername,
                password: defaultPassword
            }
        }
    } catch (error) {
        console.error("Error creating company:", error)
        return { error: "Failed to create company" }
    }
}

/**
 * Update a company (Super Admin only)
 */
export async function updateCompany(companyId: string, data: Partial<CompanyFormData>) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        // If updating slug, check uniqueness
        if (data.slug) {
            const slugRegex = /^[a-z0-9-]+$/
            if (!slugRegex.test(data.slug)) {
                return { error: "Slug must be lowercase with only letters, numbers, and hyphens" }
            }

            const existingCompany = await prisma.company.findFirst({
                where: {
                    slug: data.slug,
                    NOT: { id: companyId }
                }
            })

            if (existingCompany) {
                return { error: "A company with this slug already exists" }
            }
        }

        const company = await prisma.company.update({
            where: { id: companyId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.slug && { slug: data.slug }),
                ...(data.logo !== undefined && { logo: data.logo || null }),
                ...(data.address !== undefined && { address: data.address || null }),
                ...(data.phone !== undefined && { phone: data.phone || null }),
                ...(data.email !== undefined && { email: data.email || null })
            }
        })

        revalidatePath('/dashboard/admin/companies')
        revalidatePath(`/dashboard/admin/companies/${companyId}`)
        return { success: true, company }
    } catch (error) {
        console.error("Error updating company:", error)
        return { error: "Failed to update company" }
    }
}

/**
 * Toggle company active status (Super Admin only)
 */
export async function toggleCompanyStatus(companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        })

        if (!company) {
            return { error: "Company not found" }
        }

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: { isActive: !company.isActive }
        })

        revalidatePath('/dashboard/admin/companies')
        return {
            success: true,
            company: updatedCompany,
            message: updatedCompany.isActive ? "Company activated" : "Company deactivated"
        }
    } catch (error) {
        console.error("Error toggling company status:", error)
        return { error: "Failed to update company status" }
    }
}

/**
 * Delete a company (Super Admin only)
 * This will cascade delete all stores, users, orders, etc. associated with the company
 */
export async function deleteCompany(companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if company exists and get counts
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        stores: true,
                        users: true
                    }
                }
            }
        })

        if (!company) {
            return { error: "Company not found" }
        }

        // Warn about cascade deletion
        if (company._count.stores > 0 || company._count.users > 0) {
            // Just proceed with deletion - cascade is enabled
        }

        await prisma.company.delete({
            where: { id: companyId }
        })

        revalidatePath('/dashboard/admin/companies')
        return { success: true, message: "Company deleted successfully" }
    } catch (error) {
        console.error("Error deleting company:", error)
        return { error: "Failed to delete company" }
    }
}

/**
 * Assign a user to a company
 */
export async function assignUserToCompany(userId: string, companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { companyId }
        })

        revalidatePath('/dashboard/admin/companies')
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error("Error assigning user to company:", error)
        return { error: "Failed to assign user to company" }
    }
}

/**
 * Assign a store to a company
 */
export async function assignStoreToCompany(storeId: string, companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.store.update({
            where: { id: storeId },
            data: { companyId }
        })

        revalidatePath('/dashboard/admin/companies')
        revalidatePath('/dashboard/stores')
        return { success: true }
    } catch (error) {
        console.error("Error assigning store to company:", error)
        return { error: "Failed to assign store to company" }
    }
}

/**
 * Get users without a company assignment (for assignment dropdown)
 */
export async function getUnassignedUsers() {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized", users: [] }
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                companyId: null,
                role: { not: 'SUPER_ADMIN' } // Don't show Super Admins - they have global access
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                companyId: true
            },
            orderBy: { username: 'asc' }
        })

        return { success: true, users }
    } catch (error) {
        console.error("Error fetching unassigned users:", error)
        return { error: "Failed to fetch users", users: [] }
    }
}

/**
 * Get users assigned to a specific company
 */
export async function getCompanyUsers(companyId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized", users: [] }
    }

    try {
        const users = await prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                companyId: true
            },
            orderBy: { username: 'asc' }
        })

        return { success: true, users }
    } catch (error) {
        console.error("Error fetching company users:", error)
        return { error: "Failed to fetch users", users: [] }
    }
}

/**
 * Remove a user from their company (set companyId to null)
 */
export async function removeUserFromCompany(userId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        // Make sure we're not removing a Super Admin (they don't have companies anyway)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!user) {
            return { error: "User not found" }
        }

        if (user.role === 'SUPER_ADMIN') {
            return { error: "Cannot modify Super Admin company assignment" }
        }

        await prisma.user.update({
            where: { id: userId },
            data: { companyId: null }
        })

        revalidatePath('/dashboard/admin/companies')
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error("Error removing user from company:", error)
        return { error: "Failed to remove user from company" }
    }
}
