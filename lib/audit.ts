import { prisma, isPostgres } from "@/lib/prisma"
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

        let savedLog: any = null

        // 2. Handle differently based on database type
        if (isPostgres) {
            // WEB MODE: Write DIRECTLY to MongoDB (No local SQL write)
            // We skip prisma.activityLog.create completely

            try {
                const cloudData = {
                    action: entry.action,
                    module: entry.module,
                    entityType: entry.entityType,
                    entityId: entry.entityId,
                    userId: entry.userId,
                    userRoleId: entry.userRoleId,
                    storeId: entry.storeId,
                    tenantId: entry.tenantId,
                    reason: entry.reason,
                    severity: entry.severity || 'LOW',
                    status: entry.status || 'SUCCESS',
                    before: entry.before,
                    after: entry.after,
                    changedFields,
                    ipAddress: ip,
                    userAgent: userAgent,
                    notes: "Direct MongoDB Write"
                }

                // Just push to cloud
                const result = await pushLogToCloud(cloudData)

                // Return a mock object so callers don't crash if they expect a returned log
                // (though most callers ignore the return value)
                return result ? { ...cloudData, id: 'mongo-id', createdAt: new Date() } : null

            } catch (e) {
                console.warn("[Audit] Cloud sync failed:", e)
                return null
            }

        } else {
            // DESKTOP MODE (SQLite): Write to Local AuditLog
            const auditData = {
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

            savedLog = await prisma.auditLog.create({
                data: auditData
            })

            return savedLog
        }

        // Note: The previous "Cloud Sync" block is now handled inside the isPostgres check above
        // or skipped for SQLite (as per previous agreement to not sync from desktop)


    } catch (error) {
        console.error("Critical: Failed to log audit entry", error)
        // Don't crash main app flow for logging
        return null
    }
}

