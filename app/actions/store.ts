"use server"

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function switchStore(storeId: string) {
    const user = await getUserProfile()
    if (!user) return { error: "Not authenticated" }

    // Verify user belongs to this store
    const hasAccess = user.stores.some(s => s.id === storeId)
    if (!hasAccess && user.role !== 'SUPER_ADMIN') {
        return { error: "You do not have access to this store" }
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { defaultStoreId: storeId },
            include: { defaultStore: true }
        })
            ; (revalidateTag as any)(`user-profile-${user.id}`)
        revalidatePath("/dashboard")
        return { success: true, tableMode: updatedUser.defaultStore?.tableMode }
    } catch (error) {
        console.error("Failed to switch store:", error)
        return { error: "Failed to switch store" }
    }
}


export async function createStore(formData: FormData) {
    const user = await getUserProfile()
    if (!user || (user.role !== 'BUSINESS_OWNER' && user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized. Only Owners can create stores." }
    }
    const name = formData.get("name") as string
    const location = formData.get("location") as string

    if (!name || !location) return { error: "Name and Location required" }

    try {
        const store = await prisma.store.create({
            data: {
                name,
                location,
                tableMode: formData.get("tableMode") === 'true',
                users: { connect: { id: user.id } }
            }
        })
        revalidatePath("/dashboard/stores")
        return { success: true, store }
    } catch (error) {
        console.error(error)
        return { error: "Failed to create store" }
    }
}

export async function updateStore(storeId: string, formData: FormData) {
    const user = await getUserProfile()
    if (!user || (user.role !== 'BUSINESS_OWNER' && user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" }
    }

    const hasAccess = user.stores.some(s => s.id === storeId)
    if (!hasAccess && user.role !== 'SUPER_ADMIN') {
        return { error: "You do not have access to this store" }
    }

    const name = formData.get("name") as string
    const location = formData.get("location") as string

    try {
        await prisma.store.update({
            where: { id: storeId },
            data: {
                name,
                location,
                tableMode: formData.get("tableMode") === 'true'
            }
        })
        revalidatePath("/dashboard/stores")
        return { success: true }
    } catch (error) {
        return { error: "Failed to update store" }
    }
}

export async function deleteStore(storeId: string) {
    const user = await getUserProfile()
    if (!user || (user.role !== 'BUSINESS_OWNER' && user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" }
    }

    const hasAccess = user.stores.some(s => s.id === storeId)
    if (!hasAccess && user.role !== 'SUPER_ADMIN') {
        return { error: "You do not have access to this store" }
    }

    try {
        await prisma.store.delete({
            where: { id: storeId }
        })
        revalidatePath("/dashboard/stores")
        return { success: true }
    } catch (error) {
        console.error("Delete Error:", error)
        return { error: "Failed to delete store" }
    }
}
