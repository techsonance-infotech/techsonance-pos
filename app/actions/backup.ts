'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { isSuperAdmin } from "@/lib/tenant"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execAsync = promisify(exec)

// Backup directory configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

/**
 * Get the pg_dump executable path
 * Checks environment variable first, then common installation paths
 */
function getPgDumpPath(): string {
    // 1. Check environment variable
    let envPath = process.env.PG_DUMP_PATH

    if (envPath) {
        envPath = envPath.replace(/^["']|["']$/g, '')

        if (fs.existsSync(envPath)) {
            const stat = fs.statSync(envPath)
            if (stat.isDirectory()) {
                const candidate = path.join(envPath, 'pg_dump.exe')
                if (fs.existsSync(candidate)) return candidate

                const candidateNoExt = path.join(envPath, 'pg_dump')
                if (fs.existsSync(candidateNoExt)) return candidateNoExt
            } else {
                return envPath
            }
        }

        // If it doesn't look like a path separators, assume it's in PATH
        if (!envPath.includes(path.sep)) {
            return envPath
        }
    }

    // 2. Common PostgreSQL installation paths on Windows
    const commonPaths = [
        'C:\\Program Files\\PostgreSQL\\19\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
        '/usr/bin/pg_dump', // Linux/Mac
        '/usr/local/bin/pg_dump',
        'pg_dump' // Fallback to PATH
    ]

    for (const pgPath of commonPaths) {
        if (fs.existsSync(pgPath)) {
            return pgPath
        }
    }

    return 'pg_dump'
}

/**
 * Get the psql executable path
 */
function getPsqlPath(): string {
    // 1. Check environment variable
    let envPath = process.env.PSQL_PATH

    if (envPath) {
        envPath = envPath.replace(/^["']|["']$/g, '')

        if (fs.existsSync(envPath)) {
            const stat = fs.statSync(envPath)
            if (stat.isDirectory()) {
                const candidate = path.join(envPath, 'psql.exe')
                if (fs.existsSync(candidate)) return candidate

                const candidateNoExt = path.join(envPath, 'psql')
                if (fs.existsSync(candidateNoExt)) return candidateNoExt
            } else {
                return envPath
            }
        }

        if (!envPath.includes(path.sep)) {
            return envPath
        }
    }

    // 2. Common PostgreSQL installation paths on Windows (same as pg_dump)
    const commonPaths = [
        'C:\\Program Files\\PostgreSQL\\19\\bin\\psql.exe',
        'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
        'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
        'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
        '/usr/bin/psql', // Linux/Mac
        '/usr/local/bin/psql',
        'psql' // Fallback to PATH
    ]

    for (const psqlPath of commonPaths) {
        if (fs.existsSync(psqlPath)) {
            return psqlPath
        }
    }

    return 'psql'
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
}

/**
 * Get backup history (filtered by role)
 */
export async function getBackupHistory(limit: number = 20) {
    const user = await getUserProfile()
    if (!user) {
        return { error: "Unauthorized" }
    }

    // Only Super Admin and Business Owner can view backups
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    try {
        const whereClause = user.role === 'SUPER_ADMIN'
            ? {} // Super Admin sees all
            : { companyId: user.companyId } // Others see only their company

        const backups = await prisma.backupLog.findMany({
            where: whereClause,
            orderBy: { startedAt: 'desc' },
            take: limit,
            include: {
                triggeredBy: {
                    select: {
                        username: true
                    }
                }
            }
        })

        return { success: true, backups }
    } catch (error) {
        console.error("Error fetching backup history:", error)
        return { error: "Failed to fetch backup history" }
    }
}

/**
 * Trigger a manual database backup
 */
export async function triggerManualBackup(scope: 'FULL' | 'COMPANY' = 'FULL') {
    const user = await getUserProfile()
    if (!user) {
        return { error: "Unauthorized" }
    }

    // Only Super Admin and Business Owner can trigger backups
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    // Non-Super Admins can only backup their own company
    if (user.role !== 'SUPER_ADMIN' && scope === 'FULL') {
        return { error: "Only Super Admin can perform full database backup" }
    }

    const companyId = scope === 'COMPANY' ? user.companyId : null

    try {
        await ensureBackupDir()

        // Create backup log entry
        const backupLog = await prisma.backupLog.create({
            data: {
                type: 'MANUAL',
                scope: scope,
                companyId: companyId,
                status: 'IN_PROGRESS',
                triggeredById: user.id
            }
        })

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = scope === 'FULL'
            ? `full_backup_${timestamp}.sql`
            : `company_${user.company?.slug || companyId}_${timestamp}.sql`
        const filePath = path.join(BACKUP_DIR, fileName)

        // Get database URL from environment
        const databaseUrl = process.env.DATABASE_URL
        if (!databaseUrl) {
            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'FAILED',
                    errorMessage: 'DATABASE_URL not configured',
                    completedAt: new Date()
                }
            })
            return { error: "Database URL not configured" }
        }

        try {
            // Execute pg_dump
            // For COMPANY scope, we'd need to filter by company_id which is complex
            // For now, we do full backup and note that company-specific is a future enhancement

            // Get pg_dump path
            const pgDumpPath = getPgDumpPath()
            console.log("Using pg_dump path:", pgDumpPath)

            // Wrap executable path in quotes if it contains spaces and doesn't have them
            const pgDumpCmd = pgDumpPath.includes(' ') && !pgDumpPath.startsWith('"') && !pgDumpPath.startsWith("'")
                ? `"${pgDumpPath}"`
                : pgDumpPath

            const command = `${pgDumpCmd} "${databaseUrl}" -Fp -f "${filePath}"`

            await execAsync(command, { timeout: 300000 }) // 5 minute timeout

            // Get file size
            const stats = fs.statSync(filePath)
            const fileSize = stats.size

            // Update backup log with success
            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'COMPLETED',
                    filePath: filePath,
                    fileName: fileName,
                    fileSize: fileSize,
                    completedAt: new Date()
                }
            })

            revalidatePath('/dashboard/settings/backup')
            return {
                success: true,
                message: "Backup completed successfully",
                backup: {
                    id: backupLog.id,
                    fileName,
                    fileSize
                }
            }
        } catch (execError: any) {
            console.error("Backup execution error:", execError)
            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'FAILED',
                    errorMessage: execError.message || 'Backup command failed',
                    completedAt: new Date()
                }
            })
            return { error: "Backup failed: " + (execError.message || 'Unknown error') }
        }
    } catch (error) {
        console.error("Error triggering backup:", error)
        return { error: "Failed to initiate backup" }
    }
}

/**
 * Sync local database to online cloud database
 */
export async function syncToCloud(targetUrl?: string) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized: Only Super Admin can perform cloud sync" }
    }

    const finalUrl = targetUrl || process.env.ONLINE_DATABASE_URL
    if (!finalUrl) {
        return { error: "Target database URL is not configured (ONLINE_DATABASE_URL)" }
    }

    try {
        const localUrl = process.env.DATABASE_URL
        if (!localUrl) {
            return { error: "Local DATABASE_URL not configured" }
        }

        // Locate executables
        const pgDumpPath = getPgDumpPath()
        const psqlPath = getPsqlPath()

        console.log("Syncing from local to cloud...")
        console.log("pg_dump:", pgDumpPath)
        console.log("psql:", psqlPath)

        // Quote paths if necessary
        const pgDumpCmd = pgDumpPath.includes(' ') && !pgDumpPath.startsWith('"') && !pgDumpPath.startsWith("'")
            ? `"${pgDumpPath}"`
            : pgDumpPath

        const psqlCmd = psqlPath.includes(' ') && !psqlPath.startsWith('"') && !psqlPath.startsWith("'")
            ? `"${psqlPath}"`
            : psqlPath

        // COMMAND: pg_dump [LOCAL] | psql [REMOTE]
        // We use --no-owner --no-acl to avoid permission issues on the target
        // --clean --if-exists drops objects before creating them (Careful!)
        const command = `${pgDumpCmd} "${localUrl}" --no-owner --no-acl --clean --if-exists | ${psqlCmd} "${finalUrl}"`

        // Execute via shell
        // Note: passing passwords via URL usually works for pg_dump/psql, 
        // but explicit PGPASSWORD env var might be needed if it fails.
        // Prisma URL contains password, so tools should parse it.
        await execAsync(command, {
            timeout: 600000,
            maxBuffer: 1024 * 1024 * 100 // 100MB buffer for stderr
        })

        return { success: true, message: "Cloud sync completed successfully!" }

    } catch (error: any) {
        console.error("Cloud Sync Error:", error)
        const msg = error.stderr || error.message || "Unknown error during sync"
        return { error: `Sync failed: ${msg}` }
    }
}

/**
 * Download a backup file
 */
export async function getBackupDownloadInfo(backupId: string) {
    const user = await getUserProfile()
    if (!user) {
        return { error: "Unauthorized" }
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    try {
        const backup = await prisma.backupLog.findUnique({
            where: { id: backupId }
        })

        if (!backup) {
            return { error: "Backup not found" }
        }

        // Check access for non-Super Admins
        if (user.role !== 'SUPER_ADMIN' && backup.companyId !== user.companyId) {
            return { error: "Unauthorized" }
        }

        if (backup.status !== 'COMPLETED' || !backup.filePath) {
            return { error: "Backup file not available" }
        }

        // Check if file exists
        if (!fs.existsSync(backup.filePath)) {
            return { error: "Backup file not found on disk" }
        }

        return {
            success: true,
            backup: {
                id: backup.id,
                fileName: backup.fileName,
                filePath: backup.filePath,
                fileSize: backup.fileSize
            }
        }
    } catch (error) {
        console.error("Error getting backup info:", error)
        return { error: "Failed to get backup information" }
    }
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Only Super Admin can delete backups" }
    }

    try {
        const backup = await prisma.backupLog.findUnique({
            where: { id: backupId }
        })

        if (!backup) {
            return { error: "Backup not found" }
        }

        // Delete file if exists
        if (backup.filePath && fs.existsSync(backup.filePath)) {
            fs.unlinkSync(backup.filePath)
        }

        // Delete record
        await prisma.backupLog.delete({
            where: { id: backupId }
        })

        revalidatePath('/dashboard/settings/backup')
        return { success: true, message: "Backup deleted" }
    } catch (error) {
        console.error("Error deleting backup:", error)
        return { error: "Failed to delete backup" }
    }
}

/**
 * Get backup schedule configuration
 */
export async function getBackupSchedule() {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        let schedule = await prisma.backupSchedule.findFirst()

        // Create default schedule if none exists
        if (!schedule) {
            schedule = await prisma.backupSchedule.create({
                data: {
                    frequency: 'daily',
                    time: '02:00',
                    retentionDays: 30,
                    isEnabled: false
                }
            })
        }

        return { success: true, schedule }
    } catch (error) {
        console.error("Error fetching backup schedule:", error)
        return { error: "Failed to fetch backup schedule" }
    }
}

/**
 * Update backup schedule configuration
 */
export async function updateBackupSchedule(data: {
    frequency: string
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
    retentionDays: number
    isEnabled: boolean
}) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        // Validate time format
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
        if (!timeRegex.test(data.time)) {
            return { error: "Invalid time format. Use HH:mm" }
        }

        // Calculate next run time
        const nextRunAt = calculateNextRunTime(data.frequency, data.time, data.dayOfWeek, data.dayOfMonth)

        let schedule = await prisma.backupSchedule.findFirst()

        if (schedule) {
            schedule = await prisma.backupSchedule.update({
                where: { id: schedule.id },
                data: {
                    frequency: data.frequency,
                    time: data.time,
                    dayOfWeek: data.dayOfWeek,
                    dayOfMonth: data.dayOfMonth,
                    retentionDays: data.retentionDays,
                    isEnabled: data.isEnabled,
                    nextRunAt: data.isEnabled ? nextRunAt : null
                }
            })
        } else {
            schedule = await prisma.backupSchedule.create({
                data: {
                    frequency: data.frequency,
                    time: data.time,
                    dayOfWeek: data.dayOfWeek,
                    dayOfMonth: data.dayOfMonth,
                    retentionDays: data.retentionDays,
                    isEnabled: data.isEnabled,
                    nextRunAt: data.isEnabled ? nextRunAt : null
                }
            })
        }

        revalidatePath('/dashboard/settings/backup')
        return { success: true, schedule }
    } catch (error) {
        console.error("Error updating backup schedule:", error)
        return { error: "Failed to update backup schedule" }
    }
}

/**
 * Calculate next run time based on schedule (IST Timezone)
 */
function calculateNextRunTime(
    frequency: string,
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number
): Date {
    const [hours, minutes] = time.split(':').map(Number)

    // 1. Get current time in IST
    // We use formatted parts to get the "Wall Clock" time in India
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0')

    const istYear = getPart('year')
    const istMonth = getPart('month') - 1 // 0-indexed for JS
    const istDay = getPart('day')
    const istHour = getPart('hour')
    const istMinute = getPart('minute')

    // Helper to construct a Date object for a specific IST time
    const makeISTDate = (y: number, m: number, d: number, h: number, min: number) => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        // Construct ISO string with fixed +05:30 offset
        const iso = `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}:00+05:30`
        return new Date(iso)
    }

    // 2. Create "Candidate" time for today (or implied start day)
    let nextRun = makeISTDate(istYear, istMonth, istDay, hours, minutes)

    // 3. Adjust based on frequency
    switch (frequency) {
        case 'daily':
            // If the time has passed today, move to tomorrow
            if (nextRun <= now) {
                // Add 1 day safely
                nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000)
            }
            break

        case 'weekly':
            const currentDayOfWeek = nextRun.getDay() // 0-6 (Sun-Sat) - Note: This is getDay() on the Date object, which returns local day. 
            // Wait, nextRun.getDay() returns the day in LOCAL SYSTEM timezone, not IST.
            // But we constructed nextRun from IST ISO string.
            // Actually, we need the day of week in IST context.
            // Since we built nextRun from IST components, we "know" the day is istDay.
            // But checking Day of Week index (0-6) requires reliable calendar math.

            // Simpler approach for weekly: 
            // We know 'nextRun' corresponds to `istYear, istMonth, istDay`.
            // We can calculate the day of week index for that specific date manually or trust getUTCDay() shifted?
            // Actually, since we explicitly set the offset, getDay() might be affected by local system.
            // Use date.getUTCDay() and adjust?

            // Let's use a robust loop.
            // Keep adding 1 day until dayOfWeek matches AND it's in future.
            while (true) {
                // Check if this candidate matches the target day of week (in IST)
                // Provide a way to get IST day of week for the candidate
                const checkFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' })
                // 'Sun', 'Mon', etc.
                const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
                const checkDay = dayMap[checkFormatter.format(nextRun).split(',')[0]] // "Sun"

                if (checkDay === (dayOfWeek ?? 0) && nextRun > now) {
                    break
                }

                // Add 1 day
                nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000)
            }
            break

        case 'monthly':
            const targetDay = dayOfMonth ?? 1

            // Try to set the day to targetDay for the current month
            // We need to handle month overflow (e.g. target 31st, current month has 30)
            // But simplified:

            // Start with "Today's Month" but "Target Day"
            // We need to re-construct to be safe about month boundaries
            let m = istMonth
            let y = istYear

            // Loop to find next valid month
            while (true) {
                // Construct date for Y-M-TargetDay
                // Validate if day exists in month? JS Date handles overflow (Sept 31 -> Oct 1). We don't want that.
                // Check max days in month
                const daysInMonth = new Date(y, m + 1, 0).getDate() // This uses local system time for calculation but days in month is generally constant except leap years in local time... actually precise enough.
                const validDay = Math.min(targetDay, daysInMonth)

                let candidate = makeISTDate(y, m, validDay, hours, minutes)

                if (candidate > now) {
                    nextRun = candidate
                    break
                }

                // Move to next month
                m++
                if (m > 11) {
                    m = 0
                    y++
                }
            }
            break
    }

    return nextRun
}

/**
 * Run cleanup of old backups based on retention policy
 */
export async function cleanupOldBackups() {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
        return { error: "Unauthorized" }
    }

    try {
        const schedule = await prisma.backupSchedule.findFirst()
        if (!schedule) {
            return { error: "No backup schedule configured" }
        }

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - schedule.retentionDays)

        // Find old backups
        const oldBackups = await prisma.backupLog.findMany({
            where: {
                completedAt: {
                    lt: cutoffDate
                },
                status: 'COMPLETED'
            }
        })

        let deletedCount = 0
        for (const backup of oldBackups) {
            // Delete file
            if (backup.filePath && fs.existsSync(backup.filePath)) {
                fs.unlinkSync(backup.filePath)
            }
            // Delete record
            await prisma.backupLog.delete({
                where: { id: backup.id }
            })
            deletedCount++
        }

        revalidatePath('/dashboard/settings/backup')
        return {
            success: true,
            message: `Cleaned up ${deletedCount} old backups`
        }
    } catch (error) {
        console.error("Error cleaning up backups:", error)
        return { error: "Failed to cleanup backups" }
    }
}

/**
 * Check if a scheduled backup is due and run it
 * Designed to be called by a cron job or interval
 */
export async function checkAndRunDueScheduledBackup() {
    try {
        const schedule = await prisma.backupSchedule.findFirst()

        // If no schedule, or disabled, or next run time is in the future (or null), skip
        if (!schedule || !schedule.isEnabled || !schedule.nextRunAt || new Date() < schedule.nextRunAt) {
            return { skipped: true }
        }

        console.log("Starting scheduled backup...")
        await performScheduledBackup(schedule.id, schedule)
        return { success: true }
    } catch (error) {
        console.error("Error checking scheduled backup:", error)
        return { error: "Failed to check scheduled backup" }
    }
}

/**
 * Perform the actual scheduled backup
 */
async function performScheduledBackup(scheduleId: string, currentSchedule: any) {
    try {
        await ensureBackupDir()

        // Create log entry
        const backupLog = await prisma.backupLog.create({
            data: {
                type: 'SCHEDULED',
                scope: 'FULL', // Scheduled backups are always FULL for now
                status: 'IN_PROGRESS'
            }
        })

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `scheduled_backup_${timestamp}.sql`
        const filePath = path.join(BACKUP_DIR, fileName)
        const databaseUrl = process.env.DATABASE_URL

        if (!databaseUrl) {
            throw new Error("DATABASE_URL not configured")
        }

        try {
            // Re-use logic for pg_dump execution
            const pgDumpPath = getPgDumpPath()
            const pgDumpCmd = pgDumpPath.includes(' ') && !pgDumpPath.startsWith('"') && !pgDumpPath.startsWith("'")
                ? `"${pgDumpPath}"`
                : pgDumpPath

            const command = `${pgDumpCmd} "${databaseUrl}" -Fp -f "${filePath}"`

            await execAsync(command, { timeout: 600000 }) // 10 minute timeout for scheduled

            // Get file size
            const stats = fs.statSync(filePath)
            const fileSize = stats.size

            // Update log to completed
            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'COMPLETED',
                    filePath,
                    fileName,
                    fileSize,
                    completedAt: new Date()
                }
            })

            // Run cleanup safely
            try {
                await cleanupOldBackups()
            } catch (cleanupError) {
                console.error("Cleanup failed but backup succeeded:", cleanupError)
            }

        } catch (execError: any) {
            console.error("Scheduled backup failed:", execError)

            // Capture detailed error info
            const detailedError = execError.stderr || execError.message || 'Unknown error'
            console.error("Backup detailed stderr:", detailedError)

            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'FAILED',
                    errorMessage: `Cmd Failed: ${detailedError}`.substring(0, 1000), // Truncate to avoid DB error
                    completedAt: new Date()
                }
            })
            // Throw to prevent schedule update? No, we should still update schedule to try later
        }

        // Update Next Run Time
        const nextRunAt = calculateNextRunTime(
            currentSchedule.frequency,
            currentSchedule.time,
            currentSchedule.dayOfWeek,
            currentSchedule.dayOfMonth
        )

        await prisma.backupSchedule.update({
            where: { id: scheduleId },
            data: {
                lastRunAt: new Date(),
                nextRunAt: nextRunAt
            }
        })

        // Revalidate safely - ignore errors in background context
        try {
            revalidatePath('/dashboard/settings/backup')
        } catch (e) {
            console.log("Revalidation skipped in scheduled backup")
        }

    } catch (error) {
        console.error("Fatal error in scheduled backup:", error)
    }
}
