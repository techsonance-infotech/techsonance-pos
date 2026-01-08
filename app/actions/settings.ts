'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getUserProfile } from "./user"

const SETTINGS_KEYS = [
    'business_name',
    'business_logo',
    'business_address',
    'business_phone',
    'business_email',
    'business_gst',
    'tax_rate',
    'tax_name',
    'show_tax_breakdown',
    'enable_discount',
    'default_discount'
] as const

// Internal DB Fetcher
async function fetchBusinessSettings() {
    const settings = await prisma.systemConfig.findMany({
        where: {
            key: { in: [...SETTINGS_KEYS] }
        }
    })

    // Convert array to object
    const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value
        return acc
    }, {} as Record<string, string>)

    return {
        businessName: settingsMap.business_name || 'CafePOS',
        logoUrl: settingsMap.business_logo || '', // Default empty or placeholder
        address: settingsMap.business_address || '',
        phone: settingsMap.business_phone || '',
        email: settingsMap.business_email || '',
        gstNo: settingsMap.business_gst || '',
        taxRate: settingsMap.tax_rate || '5',
        taxName: settingsMap.tax_name || 'GST',
        showTaxBreakdown: settingsMap.show_tax_breakdown === 'true',
        enableDiscount: settingsMap.enable_discount === 'true',
        defaultDiscount: settingsMap.default_discount || '0'
    }
}

// Cached Export
export const getBusinessSettings = unstable_cache(
    async () => fetchBusinessSettings(),
    ['business-settings-data'], // Key parts
    {
        tags: ['business-settings'],
        revalidate: 30 // Reduced from 3600 for better responsiveness
    }
)

/**
 * Get company details for the current user
 * Returns company info if assigned, null if Super Admin without company
 */
export async function getCompanyDetails() {
    try {
        const user = await getUserProfile()
        if (!user) {
            return null
        }

        // If user has a company, return company details
        if (user.companyId && user.company) {
            return {
                id: user.company.id,
                name: user.company.name,
                slug: user.company.slug,
                logo: user.company.logo || '',
                address: '', // Need to fetch full company data
                phone: '',
                email: '',
                hasCompany: true
            }
        }

        // Super Admin without company - return null
        return null
    } catch (error) {
        console.error("Error fetching company details:", error)
        return null
    }
}

/**
 * Get full company details for business settings page
 */
export async function getCompanyBusinessSettings() {
    try {
        const user = await getUserProfile()
        if (!user) {
            return { hasCompany: false, settings: null }
        }

        // Fetch full company data if user has a company
        if (user.companyId) {
            const company = await prisma.company.findUnique({
                where: { id: user.companyId }
            })

            if (company) {
                return {
                    hasCompany: true,
                    settings: {
                        companyId: company.id,
                        businessName: company.name,
                        logoUrl: company.logo || '',
                        address: company.address || '',
                        phone: company.phone || '',
                        email: company.email || '',
                        slug: company.slug
                    }
                }
            }
        }

        // Super Admin or no company assigned - fall back to global settings
        const globalSettings = await fetchBusinessSettings()
        return {
            hasCompany: false,
            settings: {
                companyId: null,
                businessName: globalSettings.businessName,
                logoUrl: globalSettings.logoUrl,
                address: globalSettings.address,
                phone: globalSettings.phone,
                email: globalSettings.email,
                gstNo: globalSettings.gstNo
            }
        }
    } catch (error) {
        console.error("Error fetching company business settings:", error)
        return { hasCompany: false, settings: null }
    }
}

export async function updateBusinessSettings(prevState: any, formData: FormData) {
    try {
        const user = await getUserProfile()

        // If user has a company, update company details instead
        if (user?.companyId) {
            const result = await updateCompanyBusinessSettings(formData)
            return result
        }

        // Fallback to global settings for Super Admin without company
        const data = {
            business_name: formData.get('businessName') as string,
            business_address: formData.get('address') as string,
            business_phone: formData.get('phone') as string,
            business_email: formData.get('email') as string,
            business_gst: formData.get('gstNo') as string,
            tax_rate: formData.get('taxRate') as string,
            tax_name: formData.get('taxName') as string,
            show_tax_breakdown: formData.get('showTaxBreakdown') as string,
            enable_discount: formData.get('enableDiscount') as string,
            default_discount: formData.get('defaultDiscount') as string,
        }

        // Parallel updates
        await Promise.all(
            Object.entries(data).map(([key, value]) =>
                prisma.systemConfig.upsert({
                    where: { key },
                    update: { value: value || '' },
                    create: { key, value: value || '' }
                })
            )
        )

            ; (revalidateTag as any)('business-settings')
        revalidatePath('/')
        return { success: true, message: "Settings updated successfully" }
    } catch (error) {
        console.error("Failed to update settings:", error)
        return { success: false, message: "Failed to update settings" }
    }
}

/**
 * Update company-specific business settings
 */
async function updateCompanyBusinessSettings(formData: FormData) {
    try {
        const user = await getUserProfile()
        if (!user?.companyId) {
            return { success: false, message: "No company assigned" }
        }

        await prisma.company.update({
            where: { id: user.companyId },
            data: {
                name: formData.get('businessName') as string || undefined,
                address: formData.get('address') as string || null,
                phone: formData.get('phone') as string || null,
                email: formData.get('email') as string || null
            }
        })

        revalidatePath('/dashboard/settings/business')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/new-order')
        revalidatePath('/dashboard/recent-orders')
        revalidatePath('/')
        return { success: true, message: "Company details updated successfully" }
    } catch (error) {
        console.error("Failed to update company settings:", error)
        return { success: false, message: "Failed to update company settings" }
    }
}

export async function uploadLogo(formData: FormData) {
    try {
        const user = await getUserProfile()
        const file = formData.get('logo') as File
        if (!file) return { success: false, message: "No file provided" }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads')
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore error if exists
        }

        // Unique filename
        const filename = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
        const path = join(uploadDir, filename)

        await writeFile(path, buffer)

        const url = `/uploads/${filename}`

        // If user has a company, update company logo
        if (user?.companyId) {
            await prisma.company.update({
                where: { id: user.companyId },
                data: { logo: url }
            })
            // Revalidate all pages that show the logo
            revalidatePath('/dashboard/settings/business')
            revalidatePath('/dashboard')
            revalidatePath('/dashboard/new-order')
            revalidatePath('/dashboard/recent-orders')
            return { success: true, url }
        }

        // Fallback to global setting for Super Admin without company
        await prisma.systemConfig.upsert({
            where: { key: 'business_logo' },
            update: { value: url },
            create: { key: 'business_logo', value: url }
        })

            ; (revalidateTag as any)('business-settings')
        revalidatePath('/')
        revalidatePath('/dashboard')
        return { success: true, url }
    } catch (error) {
        console.error("Logo upload failed:", error)
        return { success: false, message: "Failed to upload logo" }
    }
}
