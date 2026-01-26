import { prisma, isPostgres } from "@/lib/prisma";
import { pushLogToCloud } from "./mongo-logger";

export async function logActivity(
    action: string,
    module: string,
    details: any,
    userId?: string
) {
    try {
        let ipAddress = 'unknown';
        let userAgent = 'unknown';

        const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);

        let log: any = null;

        if (isPostgres) {
            // WEB MODE: Write DIRECTLY to MongoDB
            pushLogToCloud({
                action,
                module,
                details,
                userId: userId || null,
                ipAddress,
                userAgent,
                createdAt: new Date()
            }).catch(err => {
                console.warn("[Logger] Cloud push failed", err);
            });

            // Return dummy object
            return { id: 'mongo-log', createdAt: new Date() };

        } else {
            // DESKTOP MODE (SQLite): Write to Local AuditLog
            const logData = {
                action,
                module,
                entityType: 'Activity',
                reason: detailsStr,
                userId: userId || null,
                ipAddress,
                userAgent,
                severity: 'LOW',
                status: 'SUCCESS',
                isSynced: false
            };

            log = await prisma.auditLog.create({
                data: logData
            });

            return log;
        }

    } catch (error) {
        console.error("[Logger] Activity logging failed:", error);
        return null;
    }
}

