'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getUserProfile } from "./user"
import { logActivity } from "@/lib/logger"

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
    'default_discount',
    'discount_type',
    'min_order_for_discount',
    'max_discount'
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
        businessName: settingsMap.business_name || '',
        logoUrl: settingsMap.business_logo || '', // Default empty or placeholder
        address: settingsMap.business_address || '',
        phone: settingsMap.business_phone || '',
        email: settingsMap.business_email || '',
        gstNo: settingsMap.business_gst || '',
        taxRate: settingsMap.tax_rate || '5',
        taxName: settingsMap.tax_name || 'GST',
        showTaxBreakdown: settingsMap.show_tax_breakdown === 'true',
        enableDiscount: settingsMap.enable_discount === 'true',
        defaultDiscount: settingsMap.default_discount || '0',
        discountType: settingsMap.discount_type || 'FIXED', // 'FIXED' | 'PERCENTAGE'
        minOrderForDiscount: settingsMap.min_order_for_discount || '0',
        maxDiscount: settingsMap.max_discount || '0'
    }
}

// Export without cache for now - cache was causing stale data issues
export async function getBusinessSettings() {
    const settings = await fetchBusinessSettings()

    // Check if user is authenticated to see full details
    const user = await getUserProfile()
    if (!user) {
        // Return only public info
        return {
            businessName: settings.businessName,
            logoUrl: settings.logoUrl,
            phone: settings.phone, // Often needed for support on login
            address: settings.address // Often needed for location confirmation
            // Omit sensitive config like tax/discount logic from public view
        }
    }

    return settings
}

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

        // Fetch global settings first as they are used in both paths
        const globalSettings = await fetchBusinessSettings()

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
                        phone: company.phone || user.contactNo || '',
                        email: company.email || user.email || '',
                        slug: company.slug,
                        // Include global tax & discount settings
                        gstNo: globalSettings.gstNo,
                        taxRate: globalSettings.taxRate,
                        taxName: globalSettings.taxName,
                        showTaxBreakdown: globalSettings.showTaxBreakdown,
                        enableDiscount: globalSettings.enableDiscount,
                        defaultDiscount: globalSettings.defaultDiscount,
                        discountType: globalSettings.discountType,
                        minOrderForDiscount: globalSettings.minOrderForDiscount,
                        maxDiscount: globalSettings.maxDiscount
                    }
                }
            }
        }

        // Super Admin or no company assigned / company not found - use global settings
        let settings = {
            companyId: null as string | null,
            businessName: globalSettings.businessName,
            logoUrl: globalSettings.logoUrl,
            address: globalSettings.address,
            phone: globalSettings.phone || user.contactNo || '',
            email: globalSettings.email || user.email || '',
            gstNo: globalSettings.gstNo,
            // Tax & Discount
            taxRate: globalSettings.taxRate,
            taxName: globalSettings.taxName,
            showTaxBreakdown: globalSettings.showTaxBreakdown,
            enableDiscount: globalSettings.enableDiscount,
            defaultDiscount: globalSettings.defaultDiscount,
            discountType: globalSettings.discountType,
            minOrderForDiscount: globalSettings.minOrderForDiscount,
            maxDiscount: globalSettings.maxDiscount
        }

        // Fetch full company data if user has a company (Redundant check? Logic above returns early if company exists... 
        // Wait, line 103 logic handles company. If company NOT found (unlikely if companyId set), falls here?
        // Actually the logic above returns if company found.
        // So below logic is for: User has companyId but company not found? OR User has no companyId.

        return {
            hasCompany: !!user.companyId,
            settings
        }
    } catch (error) {
        console.error("Error fetching company business settings:", error)
        return { hasCompany: false, settings: null }
    }
}

export async function updateBusinessSettings(prevState: any, formData: FormData) {
    try {
        const user = await getUserProfile()
        const isCompanyAdmin = !!user?.companyId

        // 1. Prepare Global Settings (Tax, Discount) - Always update these
        const globalUpdates = {
            tax_rate: formData.get('taxRate') as string,
            tax_name: formData.get('taxName') as string,
            show_tax_breakdown: formData.get('showTaxBreakdown') as string,
            enable_discount: formData.get('enableDiscount') as string,
            default_discount: formData.get('defaultDiscount') as string,
            discount_type: formData.get('discountType') as string,
            min_order_for_discount: formData.get('minOrderForDiscount') as string,
            max_discount: formData.get('maxDiscount') as string,
        }

        // 2. Prepare Business Details
        const businessUpdates = {
            business_name: formData.get('businessName') as string,
            business_address: formData.get('address') as string,
            business_phone: formData.get('phone') as string,
            business_email: formData.get('email') as string,
            business_gst: formData.get('gstNo') as string,
        }

        // 3. Update Global Settings
        await Promise.all(
            Object.entries(globalUpdates).map(([key, value]) =>
                prisma.systemConfig.upsert({
                    where: { key },
                    update: { value: value || '' },
                    create: { key, value: value || '' }
                })
            )
        )

        // 4. Update Business Details (Company vs Global)
        if (isCompanyAdmin) {
            // Update Company Record
            await prisma.company.update({
                where: { id: user!.companyId! },
                data: {
                    name: businessUpdates.business_name || undefined,
                    address: businessUpdates.business_address || null,
                    phone: businessUpdates.business_phone || null,
                    email: businessUpdates.business_email || null
                }
            })
        } else {
            // Update SystemConfig for Business Details
            await Promise.all(
                Object.entries(businessUpdates).map(([key, value]) =>
                    prisma.systemConfig.upsert({
                        where: { key },
                        update: { value: value || '' },
                        create: { key, value: value || '' }
                    })
                )
            )
        }

        (revalidateTag as any)('business-settings', 'max')
        revalidatePath('/')
        revalidatePath('/dashboard/settings/business')
        revalidatePath('/dashboard/settings/taxes')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/new-order')

        // Log Activity
        await logActivity(
            'UPDATE_SETTINGS',
            'SETTINGS',
            { globalUpdates, businessUpdates },
            user?.id
        )

        return { success: true, message: "Settings updated successfully" }
    } catch (error) {
        console.error("Failed to update settings:", error)
        return { success: false, message: "Failed to update settings" }
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

            await logActivity(
                'UPLOAD_LOGO',
                'SETTINGS',
                { url, companyId: user.companyId },
                user.id
            )

            return { success: true, url }
        }

        // Fallback to global setting for Super Admin without company
        await prisma.systemConfig.upsert({
            where: { key: 'business_logo' },
            update: { value: url },
            create: { key: 'business_logo', value: url }
        })

            ; (revalidateTag as any)('business-settings', 'max')
        revalidatePath('/')
        revalidatePath('/dashboard')

        await logActivity(
            'UPLOAD_LOGO',
            'SETTINGS',
            { url },
            user?.id
        )

        return { success: true, url }
    } catch (error) {
        console.error("Logo upload failed:", error)
        return { success: false, message: "Failed to upload logo" }
    }
}
