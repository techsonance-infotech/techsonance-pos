"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"
import { getUserProfile } from "./user"

async function getCurrentStore() {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) return null
    return user.defaultStoreId
}

// Internal DB fetcher
async function fetchCategories(storeId: string, includeInactive: boolean) {
    const where = includeInactive ? { storeId } : { isActive: true, storeId }
    const categories = await prisma.category.findMany({
        where,
        include: {
            products: {
                where: includeInactive ? {} : { isAvailable: true },
                orderBy: { sortOrder: 'asc' },
                include: {
                    addons: {
                        where: includeInactive ? {} : { isAvailable: true },
                        orderBy: { sortOrder: 'asc' }
                    }
                }
            }
        },
        orderBy: {
            sortOrder: 'asc'
        }
    })
    return categories
}

export async function getCategories(includeInactive = false) {
    try {
        const storeId = await getCurrentStore()
        if (!storeId) return []

        const tag = `store-menu-${storeId}`
        const cacheKey = `categories-${storeId}-${includeInactive}`

        return await unstable_cache(
            async () => fetchCategories(storeId, includeInactive),
            [cacheKey],
            {
                tags: [tag],
                revalidate: 30
            }
        )()
    } catch (error) {
        console.error("Failed to fetch categories:", error)
        return []
    }
}

export async function saveCategory(data: any) {
    try {
        const { id, name, sortOrder, isActive } = data

        if (id) {
            await prisma.category.update({
                where: { id }, // detailed check: id_storeId composite unique or just rely on id
                data: { name, sortOrder: Number(sortOrder), isActive }
            })
        } else {
            const storeId = await getCurrentStore()
            if (!storeId) return { success: false, error: "No store selected" }

            // Auto-assign sort order if not provided
            const count = await prisma.category.count({ where: { storeId } })
            await prisma.category.create({
                data: {
                    name,
                    sortOrder: sortOrder ? Number(sortOrder) : count + 1,
                    isActive: isActive ?? true,
                    storeId
                }
            })
        }

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)

        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")
        return { success: true }
    } catch (error) {
        console.error("Failed to save category:", error)
        return { success: false, error: (error as any).message || "Failed to save category" }
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({ where: { id } })

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)

        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete category:", error)
        return { success: false, error: "Failed to delete category" }
    }
}

export async function updateCategoryOrder(items: { id: string, sortOrder: number }[]) {
    try {
        await prisma.$transaction(
            items.map(item =>
                prisma.category.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder }
                })
            )
        )
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)

        return { success: true }
    } catch (error) {
        console.error("Failed to reorder categories:", error)
        return { success: false, error: "Failed to reorder categories" }
    }
}

export async function toggleCategoryStatus(id: string, isActive: boolean) {
    try {
        await prisma.category.update({ where: { id }, data: { isActive } })
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update category status:", error)
        return { success: false, error: "Failed to update status" }
    }
}

// --- Products ---

export async function getProducts(categoryId?: string, includeInactive = false) {
    try {
        const storeId = await getCurrentStore()
        if (!storeId) return []

        const where: any = {
            category: {
                storeId: storeId
            }
        }
        if (categoryId && categoryId !== 'all') where.categoryId = categoryId
        if (!includeInactive) where.isAvailable = true

        const products = await prisma.product.findMany({
            where,
            select: {
                id: true,
                name: true,
                price: true,
                categoryId: true,
                description: true,
                isAvailable: true,
                image: true,
                addons: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        isAvailable: true
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            },
            orderBy: { sortOrder: 'asc' } // Default sort by order
        })
        return products
    } catch (error) {
        console.error("Failed to fetch products:", error)
        return []
    }
}



export async function saveProduct(data: any) {
    try {
        const { id, name, price, categoryId, description, isAvailable, sortOrder } = data
        let product;

        if (id) {
            product = await prisma.product.update({
                where: { id },
                data: {
                    name,
                    price: parseFloat(price),
                    categoryId,
                    description,
                    isAvailable,
                    sortOrder: sortOrder ? Number(sortOrder) : undefined
                }
            })
        } else {
            const count = await prisma.product.count({ where: { categoryId } })
            product = await prisma.product.create({
                data: {
                    name,
                    price: parseFloat(price),
                    categoryId,
                    description,
                    isAvailable: isAvailable ?? true,
                    sortOrder: sortOrder ? Number(sortOrder) : count + 1
                }
            })
        }
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true, product }
    } catch (error) {
        console.error("Failed to save product:", error)
        return { success: false, error: (error as any).message || "Failed to save product" }
    }
}

export async function updateProductOrder(items: { id: string, sortOrder: number }[]) {
    try {
        await prisma.$transaction(
            items.map(item =>
                prisma.product.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder }
                })
            )
        )
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to reorder products:", error)
        return { success: false, error: "Failed to reorder products" }
    }
}

// Reuse existing toggle/delete
export async function toggleProductStatus(id: string, isAvailable: boolean) {
    try {
        await prisma.product.update({ where: { id }, data: { isAvailable } })
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update product status:", error)
        return { success: false, error: "Failed to update status" }
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({ where: { id } })
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to delete product:", error)
        return { success: false, error: "Failed to delete product" }
    }
}

// --- Addons ---

export async function saveAddon(data: any) {
    try {
        const { id, name, price, productId, isAvailable, sortOrder } = data

        if (id) {
            await prisma.addon.update({
                where: { id },
                data: { name, price: parseFloat(price), isAvailable, sortOrder: sortOrder ? Number(sortOrder) : undefined }
            })
        } else {
            const count = await prisma.addon.count({ where: { productId } })
            await prisma.addon.create({
                data: {
                    name,
                    price: parseFloat(price),
                    productId,
                    isAvailable: isAvailable ?? true,
                    sortOrder: count + 1
                }
            })
        }
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to save addon:", error)
        return { success: false, error: "Failed to save addon" }
    }
}

export async function deleteAddon(id: string) {
    try {
        await prisma.addon.delete({ where: { id } })
        revalidatePath("/dashboard/menu")
        revalidatePath("/dashboard/new-order")

        const storeId = await getCurrentStore()
        if (storeId) (revalidateTag as any)(`store-menu-${storeId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to delete addon:", error)
        return { success: false, error: "Failed to delete addon" }
    }
}
