import { prisma } from "@/lib/prisma";
import { pushLogToCloud } from "./mongo-logger";

export async function logActivity(
    action: string,
    module: string,
    details: any,
    userId?: string
) {
    try {
        // Safe access to headers (Server Components / Server Actions)
        // Note: headers() is read-only and async in some next versions, 
        // but for now we'll skip complex header parsing to avoid runtime errors in non-request contexts
        // or accept undefined.

        let ipAddress = 'unknown';
        let userAgent = 'unknown';

        /* 
           Extraction logic if needed:
           import { headers } from "next/headers";
           const headerList = headers(); 
           ipAddress = headerList.get("x-forwarded-for") || 'unknown';
           userAgent = headerList.get("user-agent") || 'unknown';
        */

        const logData = {
            action,
            module,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            userId: userId || null,
            ipAddress,
            userAgent,
            isSynced: false
        };

        // 1. Write to Local SQLite (Critical)
        const log = await prisma.activityLog.create({
            data: logData
        });

        // 2. Fire-and-Forget Push to Cloud
        // We don't await this to keep UI fast
        pushLogToCloud(log).then(async (success) => {
            if (success) {
                // Update sync status locally if needed
                await prisma.activityLog.update({
                    where: { id: log.id },
                    data: { isSynced: true }
                });
            }
        }).catch(err => {
            // Cloud push failed, we still have local log with isSynced=false
            // Can be picked up by a background job later
            console.warn("Cloud push failed for log", log.id);
        });

        return log;

    } catch (error) {
        console.error("Logging failed:", error);
        // Do not throw, logging should not break app flow
        return null;
    }
}
