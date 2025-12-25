'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { SecurityRuleType } from "@prisma/client"

async function checkSuperAdmin() {
    const user = await getUserProfile()
    return user?.role === 'SUPER_ADMIN'
}

export async function toggleMaintenanceMode(enabled: boolean) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    await prisma.systemConfig.upsert({
        where: { key: "maintenance_mode" },
        create: { key: "maintenance_mode", value: "system", isEnabled: enabled },
        update: { isEnabled: enabled }
    })
    revalidatePath('/')
    return { success: true }
}

export async function blockIP(ip: string, reason?: string) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    try {
        await prisma.securityRule.create({
            data: {
                type: 'IP',
                value: ip,
                reason
            }
        })
        revalidatePath('/dashboard/admin/security')
        return { success: true }
    } catch (e) {
        return { error: "IP likely already blocked" }
    }
}

export async function unblockIP(ip: string) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    await prisma.securityRule.delete({
        where: { value: ip }
    })
    revalidatePath('/dashboard/admin/security')
    return { success: true }
}

export async function lockUser(userId: string, isLocked: boolean) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    await prisma.user.update({
        where: { id: userId },
        data: { isLocked }
    })
    revalidatePath('/dashboard/users') // Assuming users list is here
    return { success: true }
}

export async function updateUserModules(userId: string, modules: string[]) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    await prisma.user.update({
        where: { id: userId },
        data: { disabledModules: modules }
    })
    revalidatePath('/dashboard/users')
    return { success: true }
}

export async function updateUserStores(userId: string, storeIds: string[], defaultStoreId: string | null) {
    if (!await checkSuperAdmin()) return { error: "Unauthorized" }

    await prisma.user.update({
        where: { id: userId },
        data: {
            stores: {
                set: storeIds.map(id => ({ id }))
            },
            defaultStoreId: defaultStoreId
        }
    })
    revalidatePath('/dashboard/users')
    return { success: true }
}

export async function getSecurityStatus() {
    // No auth check needed here if used in UI that handles it, but safer:
    const start = Date.now()
    if (!await checkSuperAdmin()) return null

    const rules = await prisma.securityRule.findMany({ orderBy: { createdAt: 'desc' } })
    const config = await prisma.systemConfig.findUnique({ where: { key: "maintenance_mode" } })
    const lockedUsers = await prisma.user.count({ where: { isLocked: true } })

    return {
        rules,
        maintenanceMode: config?.isEnabled || false,
        lockedUserCount: lockedUsers
    }
}
