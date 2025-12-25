'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const SETTINGS_KEYS = [
    'business_name',
    'business_logo',
    'business_address',
    'business_phone',
    'business_email',
    'business_gst',
    'tax_rate',
    'tax_name',
    'show_tax_breakdown'
] as const

export async function getBusinessSettings() {
    const settings = await prisma.systemConfig.findMany({
        where: {
            key: { in: [...SETTINGS_KEYS] }
        }
    })

    // Convert array to object
    const settingsMap = settings.reduce((acc, curr) => {
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
        showTaxBreakdown: settingsMap.show_tax_breakdown === 'true'
    }
}

export async function updateBusinessSettings(prevState: any, formData: FormData) {
    try {
        const data = {
            business_name: formData.get('businessName') as string,
            business_address: formData.get('address') as string,
            business_phone: formData.get('phone') as string,
            business_email: formData.get('email') as string,
            business_gst: formData.get('gstNo') as string,
            tax_rate: formData.get('taxRate') as string,
            tax_name: formData.get('taxName') as string,
            show_tax_breakdown: formData.get('showTaxBreakdown') as string,
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

        revalidatePath('/')
        return { success: true, message: "Settings updated successfully" }
    } catch (error) {
        console.error("Failed to update settings:", error)
        return { success: false, message: "Failed to update settings" }
    }
}

export async function uploadLogo(formData: FormData) {
    try {
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

        // Save URL to DB
        const url = `/uploads/${filename}`
        await prisma.systemConfig.upsert({
            where: { key: 'business_logo' },
            update: { value: url },
            create: { key: 'business_logo', value: url }
        })

        revalidatePath('/')
        return { success: true, url }
    } catch (error) {
        console.error("Logo upload failed:", error)
        return { success: false, message: "Failed to upload logo" }
    }
}
