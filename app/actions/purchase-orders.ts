'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function getPurchaseOrders() {
    const user = await getUserProfile()
    if (!user || !user.companyId || !user.defaultStoreId) return []

    try {
        const pos = await prisma.purchaseOrder.findMany({
            where: { storeId: user.defaultStoreId },
            include: {
                supplier: { select: { name: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        return pos
    } catch (error) {
        console.error("Failed to fetch POs:", error)
        return []
    }
}

export async function getPurchaseOrderDetails(id: string) {
    const user = await getUserProfile()
    if (!user) return null

    return prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
            supplier: true,
            items: true,
            createdBy: { select: { username: true } }
        }
    })
}

export async function createPurchaseOrder(data: {
    supplierId: string,
    items: { ingredientId: string, name: string, quantity: number, price: number }[],
    expectedDate?: string
}) {
    const user = await getUserProfile()
    if (!user || user.role !== 'BUSINESS_OWNER' && user.role !== 'MANAGER') {
        return { error: "Unauthorized" }
    }
    const storeId = user.defaultStoreId
    if (!storeId) return { error: "No active store" }

    try {
        // Generate PO Number (Simplistic for now: PO-<Timestamp>)
        // In production: Use a sequence table or atomic counter
        const poNumber = `PO-${Date.now().toString().slice(-6)}`
        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                storeId,
                supplierId: data.supplierId,
                createdById: user.id,
                status: 'SENT', // Skipping DRAFT for MVP speed, go straight to SENT
                totalAmount,
                expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
                items: {
                    create: data.items.map(item => ({
                        ingredientId: item.ingredientId,
                        ingredientName: item.name,
                        orderedQty: item.quantity,
                        unitPrice: item.price,
                        totalPrice: item.quantity * item.price
                    }))
                }
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'INVENTORY', // or PURCHASE
            entityType: 'PurchaseOrder',
            entityId: po.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId!,
            storeId: storeId,
            reason: `Created PO ${poNumber} for ₹${totalAmount}`,
            severity: 'MEDIUM'
        })

        revalidatePath('/dashboard/inventory/purchase-orders')
        return { success: true, id: po.id }
    } catch (error) {
        console.error("Create PO failed:", error)
        return { error: "Failed to create Purchase Order" }
    }
}

// CRITICAL: Receive PO and Update Stock
export async function receivePurchaseOrder(poId: string) {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) return { error: "Unauthorized" }

    const storeId = user.defaultStoreId

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Fetch PO with Items
            const po = await tx.purchaseOrder.findUnique({
                where: { id: poId },
                include: { items: true }
            })

            if (!po) throw new Error("PO not found")
            if (po.status === 'COMPLETED') throw new Error("PO already received")

            // 2. Loop Items
            for (const item of po.items) {
                // a. Upsert Inventory Item
                const inventoryItem = await tx.inventoryItem.upsert({
                    where: {
                        storeId_ingredientId: {
                            storeId,
                            ingredientId: item.ingredientId
                        }
                    },
                    update: {},
                    create: {
                        storeId,
                        ingredientId: item.ingredientId,
                        quantity: 0
                    }
                })

                // b. Update Stock (Increment)
                // We assume Received Qty = Ordered Qty for MVP 'Receive All'
                await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { quantity: { increment: item.orderedQty } }
                })

                // c. Update PO Item Received Qty
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: { receivedQty: item.orderedQty }
                })

                // d. Log Transaction
                await tx.inventoryTransaction.create({
                    data: {
                        type: 'IN',
                        quantity: item.orderedQty,
                        reason: `Purchase Order ${po.poNumber}`,
                        referenceId: po.id,
                        inventoryItemId: inventoryItem.id,
                        performedById: user.id,
                        costPerUnit: item.unitPrice
                    }
                })
            }

            // 3. Mark PO as Completed
            await tx.purchaseOrder.update({
                where: { id: poId },
                data: {
                    status: 'COMPLETED',
                    receivedDate: new Date()
                }
            })
        })

        await logAudit({
            action: 'UPDATE', // or RECEIVE
            module: 'INVENTORY',
            entityType: 'PurchaseOrder',
            entityId: poId,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId!,
            storeId: storeId,
            reason: `Received PO (Stock updated)`,
            severity: 'MEDIUM',
            after: { status: 'COMPLETED' }
        })

        revalidatePath('/dashboard/inventory')
        revalidatePath(`/dashboard/inventory/purchase-orders/${poId}`)
        return { success: true }

    } catch (error: any) {
        console.error("Receive PO failed:", error)
        return { error: error.message || "Failed to receive PO" }
    }
}
