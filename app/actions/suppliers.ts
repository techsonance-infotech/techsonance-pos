'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"

export async function getSuppliers() {
    const user = await getUserProfile()
    if (!user || !user.companyId) return []

    try {
        const suppliers = await prisma.supplier.findMany({
            where: { companyId: user.companyId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { ingredients: true, purchaseOrders: true }
                }
            }
        })
        return suppliers
    } catch (error) {
        console.error("Failed to fetch suppliers:", error)
        return []
    }
}

export async function createSupplier(formData: FormData) {
    const user = await getUserProfile()
    if (!user || user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const gstNo = formData.get('gstNo') as string
    const address = formData.get('address') as string

    try {
        const existing = await prisma.supplier.findFirst({
            where: {
                companyId: user.companyId!,
                name: { equals: name, mode: 'insensitive' }
            }
        })
        if (existing) return { error: "Supplier with this name already exists" }

        await prisma.supplier.create({
            data: {
                name,
                contactName,
                phone,
                email,
                gstNo,
                address,
                companyId: user.companyId!
            }
        })
        revalidatePath('/dashboard/inventory/suppliers')
        return { success: true }
    } catch (error) {
        console.error("Create supplier failed:", error)
        return { error: "Failed to create supplier" }
    }
}

export async function deleteSupplier(id: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.supplier.delete({
            where: { id }
        })
        revalidatePath('/dashboard/inventory/suppliers')
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete supplier" }
    }
}
