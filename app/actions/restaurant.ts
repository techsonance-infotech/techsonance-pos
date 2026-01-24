'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from 'uuid'
import { logAudit } from "@/lib/audit"

// ========== FLOORS & TABLES ==========

export async function getFloors() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    try {
        const floors = await prisma.floor.findMany({
            where: { storeId: user.defaultStoreId },
            include: {
                tables: {
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { sortOrder: 'asc' }
        })
        return { floors }
    } catch (error) {
        return { error: "Failed to fetch floors" }
    }
}

export async function createFloor(name: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    try {
        const floor = await prisma.floor.create({
            data: {
                name,
                storeId: user.defaultStoreId,
                sortOrder: 0 // Default, can be reordered later
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'SETTINGS', // or RESTAURANT
            entityType: 'Floor',
            entityId: floor.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Created floor: ${name}`,
            severity: 'LOW'
        })

        revalidatePath('/dashboard/floors')
        return { success: true }
    } catch (error) {
        return { error: "Failed to create floor" }
    }
}

export async function createTable(name: string, capacity: number, floorId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    try {
        const table = await prisma.table.create({
            data: {
                name,
                capacity,
                storeId: user.defaultStoreId,
                floorId,
                qrToken: uuidv4(), // Auto-generate secure token
                x: 0,
                y: 0
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'SETTINGS',
            entityType: 'Table',
            entityId: table.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Created table: ${name} (Cap: ${capacity})`,
            severity: 'LOW'
        })

        revalidatePath('/dashboard/floors')
        return { success: true }
    } catch (error) {
        return { error: "Failed to create table" }
    }
}

export async function updateTableLayout(tableId: string, x: number, y: number) {
    // Optimistic update, no store check for speeed? Safe to check.
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        await prisma.table.update({
            where: { id: tableId, storeId: user.defaultStoreId },
            data: { x, y }
        })
        revalidatePath('/dashboard/floors')
        return { success: true }
    } catch (e) {
        return { error: "Update failed" }
    }
}


// ========== RESERVATIONS ==========

export async function getReservations(date: Date) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        const reservations = await prisma.reservation.findMany({
            where: {
                storeId: user.defaultStoreId,
                reservationTime: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            orderBy: { reservationTime: 'asc' },
            include: { table: true }
        })
        return { reservations }
    } catch (error) {
        return { error: "Failed to fetch reservations" }
    }
}

export async function createReservation(data: { name: string, phone: string, guests: number, time: string, notes?: string }) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    try {
        const res = await prisma.reservation.create({
            data: {
                storeId: user.defaultStoreId,
                customerName: data.name,
                customerPhone: data.phone,
                guests: data.guests,
                reservationTime: new Date(data.time),
                notes: data.notes
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'POS', // Reservation is part of ops
            entityType: 'Reservation',
            entityId: res.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Reservation for ${data.name} (${data.guests} pax)`,
            severity: 'LOW'
        })

        revalidatePath('/dashboard/reservations')
        return { success: true }
    } catch (error) {
        return { error: "Failed to book" }
    }
}

export async function checkInReservation(reservationId: string, tableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "No active store" }

    try {
        // Transaction: Update Reservation -> Update Table Status
        await prisma.$transaction([
            prisma.reservation.update({
                where: { id: reservationId },
                data: { status: 'SEATED', tableId }
            }),
            prisma.table.update({
                where: { id: tableId },
                data: { status: 'OCCUPIED' }
            })
        ])

        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Reservation',
            entityId: reservationId,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Guest checked in to Table ${tableId}`, // Ideally fetch table name
            severity: 'LOW'
        })

        revalidatePath('/dashboard/reservations')
        return { success: true }
    } catch (error) {
        return { error: "Check-in failed" }
    }
}

// ========== ADVANCED ACTIONS (SPRINT 13) ==========

export async function transferTable(fromTableId: string, toTableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        // 1. Get Source Table Order
        // We find the 'active' order. In our schema, Order links to TableId. 
        // We look for statuses that are 'active' (not COMPLETED/CANCELLED). Here we assume anything executing is active.
        // Actually, schema `fulfillmentStatus` or `status`? `status` in Order is HELD or COMPLETED. 
        // We assume HELD is the active state for dining.

        const sourceOrder = await prisma.order.findFirst({
            where: {
                tableId: fromTableId,
                status: 'HELD' // Active dine-in order
            }
        })

        if (!sourceOrder) return { error: "No active order on source table" }

        // 2. Check Target Table
        const targetTable = await prisma.table.findUnique({ where: { id: toTableId } })
        if (!targetTable) return { error: "Target table not found" }
        if (targetTable.status !== 'AVAILABLE' && targetTable.status !== 'CLEANING') {
            // Optional: allow override by manager? For MVP, strict check.
            return { error: "Target table is not vacant" }
        }

        // 3. Perform Transfer (Transaction)
        await prisma.$transaction([
            // Update Order
            prisma.order.update({
                where: { id: sourceOrder.id },
                data: {
                    tableId: toTableId,
                    tableName: targetTable.name
                }
            }),
            // Update Source Table
            prisma.table.update({
                where: { id: fromTableId },
                data: { status: 'CLEANING' } // or AVAILABLE
            }),
            // Update Target Table
            prisma.table.update({
                where: { id: toTableId },
                data: { status: 'OCCUPIED' }
            })
        ])

        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Order',
            entityId: sourceOrder.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Transferred Table ${fromTableId} -> ${toTableId}`,
            severity: 'MEDIUM'
        })

        revalidatePath('/dashboard/pos')
        return { success: true }
    } catch (error) {
        console.error("Transfer error", error)
        return { error: "Transfer failed" }
    }
}

export async function mergeTables(sourceTableId: string, targetTableId: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    try {
        if (sourceTableId === targetTableId) return { error: "Same table selected" }

        const sourceOrder = await prisma.order.findFirst({
            where: { tableId: sourceTableId, status: 'HELD' }
        })
        if (!sourceOrder) return { error: "No order to merge from" }

        const targetOrder = await prisma.order.findFirst({
            where: { tableId: targetTableId, status: 'HELD' }
        })

        if (!targetOrder) {
            // If target has no order, just transfer
            return transferTable(sourceTableId, targetTableId)
        }

        // Merge Logic
        // 1. Parse Items
        const sourceItems = JSON.parse(sourceOrder.items as string || '[]')
        const targetItems = JSON.parse(targetOrder.items as string || '[]')

        // 2. Combine Items (Simply append for now)
        const combinedItems = [...targetItems, ...sourceItems]

        // 3. Recalculate Totals
        // Simple logic: add totals. (Taxes/Discounts might need complex recalc, taking simplified approach)
        const newTotal = targetOrder.totalAmount + sourceOrder.totalAmount
        const newTax = targetOrder.taxAmount + sourceOrder.taxAmount

        // 4. Transaction
        await prisma.$transaction([
            // Update Target Order
            prisma.order.update({
                where: { id: targetOrder.id },
                data: {
                    items: JSON.stringify(combinedItems),
                    totalAmount: newTotal,
                    taxAmount: newTax
                    // Note: Discount logic skipped for brevity
                }
            }),
            // Cancel Source Order
            prisma.order.update({
                where: { id: sourceOrder.id },
                data: {
                    status: 'CANCELLED',
                    tableId: null // Detach from table
                }
            }),
            // Free Source Table
            prisma.table.update({
                where: { id: sourceTableId },
                data: { status: 'CLEANING' }
            })
        ])

        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Order',
            entityId: targetOrder.id,
            userId: user.id,
            userRoleId: user.role,
            tenantId: user.companyId || undefined,
            storeId: user.defaultStoreId,
            reason: `Merged Table ${sourceTableId} into ${targetTableId}`,
            severity: 'MEDIUM'
        })

        revalidatePath('/dashboard/pos')
        return { success: true }

    } catch (error) {
        console.error("Merge error", error)
        return { error: "Merge failed" }
    }
}
