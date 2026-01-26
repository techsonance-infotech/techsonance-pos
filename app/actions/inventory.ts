'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function getInventoryItems(
    search?: string,
    page: number = 1,
    limit: number = 50
) {
    const user = await getUserProfile()
    if (!user || !user.companyId) return { items: [], total: 0, totalPages: 0 }

    const storeId = user.defaultStoreId
    if (!storeId) return { items: [], total: 0, totalPages: 0 }

    const skip = (page - 1) * limit

    try {
        // Build Where Clause
        const where: any = {
            companyId: user.companyId
        }

        if (search) {
            where.name = { contains: search, mode: 'insensitive' }
        }

        // Parallel Fetch: Total Count + Data
        const [total, ingredients] = await Promise.all([
            prisma.ingredient.count({ where }),
            prisma.ingredient.findMany({
                where,
                include: {
                    inventoryItems: {
                        where: { storeId: storeId }
                    },
                    supplier: {
                        select: { name: true }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit
            })
        ])

        // Map to a flat structure for the UI
        const items = ingredients.map((ing: any) => {
            const stock = ing.inventoryItems[0]?.quantity || 0
            return {
                id: ing.id,
                name: ing.name,
                unit: ing.unit,
                costPrice: ing.costPrice,
                minStock: ing.minStock,
                currentStock: stock,
                supplierName: ing.supplier?.name || 'N/A',
                status: stock <= ing.minStock ? 'LOW_STOCK' : 'OK'
            }
        })

        return {
            items,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        }
    } catch (error) {
        console.error("Failed to fetch inventory:", error)
        return { items: [], total: 0, totalPages: 0 }
    }
}

export async function createIngredient(formData: FormData) {
    const user = await getUserProfile()
    if (!user || user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    const name = formData.get('name') as string
    const unit = formData.get('unit') as string
    const costPrice = parseFloat(formData.get('costPrice') as string) || 0
    const minStock = parseFloat(formData.get('minStock') as string) || 0
    const storeId = user.defaultStoreId

    if (!storeId) return { error: "No active store selected" }

    try {
        // Business Rule: Check for duplicates within the company
        const existing = await prisma.ingredient.findFirst({
            where: {
                companyId: user.companyId!,
                name: { equals: name, mode: 'insensitive' } // Case-insensitive check
            }
        })

        if (existing) {
            return { error: "Ingredient with this name already exists" }
        }

        // Business Rule: Create Ingredient AND Initialize Stock for current store
        await prisma.$transaction(async (tx: any) => {
            const ingredient = await tx.ingredient.create({
                data: {
                    name,
                    unit,
                    costPrice,
                    minStock,
                    companyId: user.companyId!
                }
            })

            // Initialize 0 stock
            await tx.inventoryItem.create({
                data: {
                    storeId: storeId,
                    ingredientId: ingredient.id,
                    quantity: 0
                }
            })
        })

        await logAudit({
            action: 'CREATE',
            module: 'INVENTORY',
            entityType: 'Ingredient',
            entityId: name, // We don't have ID easily from transaction without refactoring, using name
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId!,
            storeId: storeId,
            reason: `Created ingredient: ${name}`,
            severity: 'LOW'
        })

        revalidatePath('/dashboard/inventory')
        return { success: true }
    } catch (error) {
        console.error("Create ingredient failed:", error)
        return { error: "Failed to create ingredient" }
    }
}

// Next Step Implementation: Stock Adjustment (In/Out/Wastage)
export async function adjustStock(ingredientId: string, quantity: number, type: 'IN' | 'OUT' | 'WASTAGE', reason?: string) {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) return { error: "Unauthorized or no store" }

    const storeId = user.defaultStoreId

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Get or Create Inventory Item
            // (It should exist if created via UI, but safe to upsert if imported/legacy)
            const inventoryItem = await tx.inventoryItem.upsert({
                where: {
                    storeId_ingredientId: {
                        storeId,
                        ingredientId
                    }
                },
                update: {}, // No update needed, just fetch ID
                create: {
                    storeId,
                    ingredientId,
                    quantity: 0
                }
            })

            // 2. Calculate Change
            // IN = Add
            // OUT/WASTAGE = Subtract
            const change = (type === 'IN') ? quantity : -quantity

            // 3. Update Stock
            const updatedItem = await tx.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: {
                    quantity: { increment: change }
                }
            })

            // 4. Log Transaction (Audit Trail)
            await tx.inventoryTransaction.create({
                data: {
                    type,
                    quantity: quantity, // Log the absolute value involved
                    reason,
                    inventoryItemId: inventoryItem.id,
                    performedById: user.id,
                    costPerUnit: 0 // TODO: Fetch current cost price from Ingredient snapshot
                }
            })
        })

        // 5. Centralized Audit Log (Async)
        // We do this matching the input parameters
        await logAudit({
            action: 'UPDATE',
            module: 'INVENTORY',
            entityType: 'InventoryItem',
            entityId: ingredientId, // or inventoryItem ID if available, but here we have ingredientId handy
            userId: user.id,
            userRoleId: user.role,
            storeId: storeId,
            tenantId: user.companyId!,
            reason: reason || `Stock ${type} adjust`,
            severity: 'MEDIUM',
            // Ideally we'd capture before/after stock, but that requires fetching it first.
            // For now, we log the *adjustment*.
            after: { change: quantity, type: type }
        })

        revalidatePath('/dashboard/inventory')
        return { success: true }

    } catch (error) {
        console.error("Adjust stock failed:", error)
        return { error: "Failed to adjust stock" }
    }
}

// History / Audit Log
export async function getInventoryTransactions() {
    const user = await getUserProfile()
    if (!user || !user.companyId) return []

    const storeId = user.defaultStoreId // Filter by current store context
    // Ideally we filter transactions where inventoryItem.storeId == storeId

    try {
        const transactions = await prisma.inventoryTransaction.findMany({
            where: {
                inventoryItem: {
                    storeId: storeId // Implicitly filters by store
                }
            },
            include: {
                inventoryItem: {
                    include: { ingredient: true }
                },
                performedBy: {
                    select: { username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 for performance
        })

        return transactions.map((t: any) => ({
            id: t.id,
            date: t.createdAt,
            type: t.type,
            ingredientName: t.inventoryItem.ingredient.name,
            quantity: t.quantity,
            unit: t.inventoryItem.ingredient.unit,
            reason: t.reason || '-',
            user: t.performedBy?.username || 'System'
        }))
    } catch (error) {
        console.error("Failed to fetch transactions:", error)
        return []
    }
}
