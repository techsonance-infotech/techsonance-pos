'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

// Constants
const VARIANCE_THRESHOLD = 100 // Should come from Config

export async function getCurrentShift() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return null

    try {
        const shift = await prisma.shift.findFirst({
            where: {
                userId: user.id,
                storeId: user.defaultStoreId,
                status: 'OPEN' // Or REVIEW if we want to block new shift until review is done? 
                // Usually only one ACTIVE shift allowed.
            },
            include: {
                cashTransactions: true // Load transactions for summary
            }
        })
        return shift
    } catch (error) {
        return null
    }
}

export async function openShift(openingBalance: number, notes?: string) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    if (openingBalance < 0) return { error: "Opening balance cannot be negative" }

    try {
        // Check if active shift exists
        const existing = await prisma.shift.findFirst({
            where: {
                userId: user.id,
                storeId: user.defaultStoreId,
                status: 'OPEN'
            }
        })

        if (existing) {
            return { error: "You already have an active shift." }
        }

        const shift = await prisma.shift.create({
            data: {
                userId: user.id,
                storeId: user.defaultStoreId,
                openingBalance,
                status: 'OPEN',
                startTime: new Date()
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'POS',
            entityType: 'Shift',
            entityId: shift.id,
            userId: user.id,
            userRoleId: user.role,
            storeId: user.defaultStoreId,
            tenantId: user.companyId || undefined,
            reason: `Shift opened. Opening Cash: ₹${openingBalance}`,
            after: { openingBalance }
        })

        revalidatePath('/dashboard')
        return { success: true, shift }
    } catch (error) {
        console.error("Open Shift Error:", error)
        return { error: "Failed to open shift" }
    }
}

export async function addCashTransaction(data: {
    type: 'CASH_IN' | 'CASH_OUT' | 'CASH_DROP' | 'EXPENSE',
    amount: number,
    reason?: string,
    category?: string,
    attachment?: string
}) {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return { error: "Unauthorized" }

    const shift = await getCurrentShift()
    if (!shift) return { error: "No active shift found" }

    if (data.amount <= 0) return { error: "Amount must be positive" }

    try {
        const tx = await prisma.cashTransaction.create({
            data: {
                shiftId: shift.id,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
                category: data.category,
                attachment: data.attachment,
                performedById: user.id
            }
        })

        await logAudit({
            action: 'CREATE',
            module: 'POS',
            entityType: 'CashTransaction',
            entityId: tx.id,
            userId: user.id,
            userRoleId: user.role,
            storeId: user.defaultStoreId,
            tenantId: user.companyId || undefined,
            reason: `Cash Transaction: ${data.type} of ₹${data.amount} for ${data.reason || 'N/A'}`,
            after: tx
        })

        revalidatePath('/dashboard/shift')
        return { success: true, transaction: tx }

    } catch (error) {
        return { error: "Failed to add cash transaction" }
    }
}

export async function getShiftSummary() {
    const user = await getUserProfile()
    if (!user?.defaultStoreId) return null

    const shift = await getCurrentShift()
    if (!shift) return null

    // Fetch Orders linked to shift
    const orders = await prisma.order.findMany({
        where: {
            shiftId: shift.id,
            status: 'COMPLETED'
        }
    })

    // 1. Calculate Sales
    // explicit casting to avoid implicit errors
    const salesByMode = {
        CASH: orders.filter((o: any) => o.paymentMode === 'CASH').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
        CARD: orders.filter((o: any) => o.paymentMode === 'CARD').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
        UPI: orders.filter((o: any) => o.paymentMode === 'UPI').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
        OTHER: orders.filter((o: any) => o.paymentMode === 'OTHER').reduce((sum: number, o: any) => sum + o.totalAmount, 0),
    }

    const totalSales = salesByMode.CASH + salesByMode.CARD + salesByMode.UPI + salesByMode.OTHER

    // 2. Calculate Cash Transactions
    // Explicit type casting or just let Prisma interface work (it's loaded via include)
    const cashTransactions = shift.cashTransactions || []

    const cashIn = cashTransactions
        .filter((t: any) => t.type === 'CASH_IN')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

    const cashOut = cashTransactions
        .filter((t: any) => t.type === 'CASH_OUT' || t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

    const cashDrop = cashTransactions
        .filter((t: any) => t.type === 'CASH_DROP')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

    // 3. Refunds (Future: If we track refunds in Audit or separate Transaction table, include here. 
    // For now assuming refunds are done via Order Status 'CANCELLED' which excludes them from 'COMPLETED' list above.
    // If partial refund exists, we need 'RefundTransaction'. Assuming full cancel for MVP.)

    // 4. Expected Cash Calculation
    // Opening + Cash Sales + Cash In - Cash Out - Cash Drop = Expected in Drawer
    const expectedCash = shift.openingBalance + salesByMode.CASH + cashIn - cashOut - cashDrop

    return {
        shift,
        summary: {
            openingBalance: shift.openingBalance,
            sales: salesByMode,
            totalSales,
            cashIn,
            cashOut,
            cashDrop,
            expectedCash,
            orderCount: orders.length
        }
    }
}

export async function closeShift(data: {
    closingBalance: number,
    denominations: Record<string, number>, // e.g. {"500": 10}
    notes?: string
}) {
    const summaryData = await getShiftSummary()
    if (!summaryData) return { error: "No active shift" }

    const { shift, summary } = summaryData
    const variance = data.closingBalance - summary.expectedCash
    const absVariance = Math.abs(variance)

    // Status Logic
    // If strict mode, block close? Requirement says "Shift cannot be finalized OR flagged as Needs Review".
    // We will flag as REVIEW if variance > threshold
    const status = absVariance > VARIANCE_THRESHOLD ? 'REVIEW' : 'CLOSED'

    try {
        const closedShift = await prisma.shift.update({
            where: { id: shift.id },
            data: {
                endTime: new Date(),
                closingBalance: data.closingBalance,
                expectedCash: summary.expectedCash,
                variance,
                status: status,
                denominations: JSON.stringify(data.denominations),
                closingNotes: data.notes
            }
        })

        await logAudit({
            action: 'UPDATE',
            module: 'POS',
            entityType: 'Shift',
            entityId: shift.id,
            userId: shift.userId,
            userRoleId: 'CASHIER', // or actual
            storeId: shift.storeId,
            reason: `Shift closed. Status: ${status}. Variance: ₹${variance}`,
            severity: status === 'REVIEW' ? 'HIGH' : 'LOW',
            after: {
                closingBalance: data.closingBalance,
                variance,
                status
            }
        })

        revalidatePath('/dashboard')
        return { success: true, shift: closedShift }
    } catch (error) {
        console.error("Close Shift Error:", error)
        return { error: "Failed to close shift" }
    }
}
