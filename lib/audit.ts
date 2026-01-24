import { prisma } from "@/lib/prisma"
import { pushLogToCloud } from "@/lib/mongo-logger"
import { headers } from "next/headers"

// Types matching Schema
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'VIEW' | 'TICKET_CREATED' | 'STATUS_UPDATED'
type AuditModule = 'POS' | 'INVENTORY' | 'PURCHASE' | 'AUTH' | 'REPORT' | 'SETTINGS' | 'USER' | 'AI' | 'SUPPORT'
type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface AuditLogEntry {
    action: AuditAction
    module: AuditModule
    entityType: string
    entityId?: string // Optional if not applicable (e.g. Login)

    userId?: string
    userRoleId?: string
    storeId?: string
    tenantId?: string

    before?: any
    after?: any

    reason?: string
    severity?: AuditSeverity
    status?: 'SUCCESS' | 'FAILURE'
}

export async function logAudit(entry: AuditLogEntry) {
    try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for') || '127.0.0.1'
        const userAgent = headersList.get('user-agent') || 'Unknown'

        // 1. Calculate Diff (Simple field extraction)
        let changedFields: string[] = []
        if (entry.before && entry.after) {
            const allKeys = new Set([...Object.keys(entry.before), ...Object.keys(entry.after)])
            allKeys.forEach(key => {
                // @ts-ignore
                if (JSON.stringify(entry.before[key]) !== JSON.stringify(entry.after[key])) {
                    changedFields.push(key)
                }
            })
        }

        // 2. Prepare Data
        const logData = {
            action: entry.action,
            module: entry.module,
            entityType: entry.entityType,
            entityId: entry.entityId,
            userId: entry.userId,
            userRoleId: entry.userRoleId,
            storeId: entry.storeId,
            tenantId: entry.tenantId,
            beforeData: entry.before ? JSON.stringify(entry.before) : null,
            afterData: entry.after ? JSON.stringify(entry.after) : null,
            changedFields: changedFields.length > 0 ? JSON.stringify(changedFields) : null,
            reason: entry.reason,
            severity: entry.severity || 'LOW',
            status: entry.status || 'SUCCESS',
            ipAddress: ip,
            userAgent: userAgent,
            isSynced: false
        }

        // 3. Save to Local DB (SQLite)
        const savedLog = await prisma.auditLog.create({
            data: logData
        })

        // 4. Async Sync to Cloud (Fire and Forget)
        // We don't await this to keep response fast, unless strictly required.
        // But Next.js Server Actions usually finish before async tasks in background are guaranteed (?)
        // Actually, in Server Actions, Vercel/Next might kill the process. 
        // For local persistent server it's fine.
        // Ideally use a queue. For now, we await it but with a timeout or just try-catch.

        try {
            const synced = await pushLogToCloud({
                ...logData, // Send the parsed JSON data to mongo, or stringified? 
                // Mongo supports JSON. Let's send objects if possible or just the raw record.
                // The mongo-logger takes 'any'. 
                // Better to send mapped object.
                before: entry.before, // Send raw object to mongo for easier querying
                after: entry.after,
                id: savedLog.id,
                localCreatedAt: savedLog.createdAt
            })

            if (synced) {
                await prisma.auditLog.update({
                    where: { id: savedLog.id },
                    data: { isSynced: true }
                })
            }
        } catch (e) {
            // Cloud sync failed, cron will pick it up later (to be implemented)
            console.warn("Real-time audit sync failed", e)
        }

        return savedLog

    } catch (error) {
        console.error("Critical: Failed to log audit entry", error)
        // Fallback? Don't crash main app flow for logging usually, unless strict compliance.
        return null
    }
}
