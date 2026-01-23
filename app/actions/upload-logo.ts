'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath, revalidateTag } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getUserProfile } from "./user"
import { logActivity } from "@/lib/logger"

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
