'use server'

// console.log("[BackupActionFile] Module loaded")

import { prisma } from "@/lib/prisma"
import { PrismaClient as PostgresClient } from "@prisma/client-postgres"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "./user"
import { isSuperAdmin } from "@/lib/tenant"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import os from "os"

const execAsync = promisify(exec)

// Backup directory configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

// PostgreSQL client for web operations
let pgClient: PostgresClient | null = null
function getPostgresClient() {
    if (!pgClient) {
        pgClient = new PostgresClient({
            datasourceUrl: process.env.DATABASE_URL
        })
    }
    return pgClient
}

// Get the appropriate prisma client based on context
function getDbClient(isPostgres: boolean) {
    return isPostgres ? getPostgresClient() : prisma
}

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
 * Combines database records with filesystem scan to show all backup files
 */
export async function getBackupHistory(limit: number = 20) {
    // console.log("[BackupHistory] Server action called")
    try {
        const user = await getUserProfile()
        if (!user) return { error: "Unauthorized" }

        // console.log(`[BackupHistory] User profile found: ${!!user}, role: ${user?.role}`)

        await ensureBackupDir()
        const filesystemBackups: any[] = []

        // console.log(`[BackupHistory] Checking folder: ${BACKUP_DIR}`)
        if (fs.existsSync(BACKUP_DIR)) {
            const files = fs.readdirSync(BACKUP_DIR)
            // console.log(`[BackupHistory] Files in directory: ${files.join(', ')}`)

            for (const file of files) {
                if (file.startsWith('backup_') && (file.endsWith('.sql') || file.endsWith('.sqlite'))) {
                    try {
                        const filePath = path.join(BACKUP_DIR, file)
                        const stats = fs.statSync(filePath)

                        filesystemBackups.push({
                            id: `fs_${file}`,
                            type: file.endsWith('.sql') ? 'POSTGRES' : 'SQLITE',
                            scope: 'FULL',
                            status: 'COMPLETED',
                            fileName: file,
                            filePath: filePath,
                            fileSize: stats.size,
                            startedAt: stats.mtime,
                            completedAt: stats.mtime,
                            triggeredBy: { username: 'System (FS)' },
                            source: 'filesystem'
                        })
                    } catch (e) {
                        console.error(`[BackupHistory] Error processing file ${file}:`, e)
                    }
                }
            }
        }

        // console.log(`[BackupHistory] Found ${filesystemBackups.length} filesystem backups`)

        // Try DB fetch, but don't let it crash the whole thing
        let dbBackups: any[] = []
        try {
            // Only attempt DB fetch if user is authenticated
            if (user) {
                const dbUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '')
                const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:")
                const db = getDbClient(isPostgres) as any

                dbBackups = await db.backupLog.findMany({
                    where: user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId },
                    orderBy: { startedAt: 'desc' },
                    take: limit,
                    include: { triggeredBy: { select: { username: true } } }
                })
                // console.log(`[BackupHistory] Fetched ${dbBackups.length} records from DB`)
            } else {
                console.warn(`[BackupHistory] User not authenticated, skipping DB fetch`)
            }
        } catch (dbError: any) {
            console.warn(`[BackupHistory] DB fetch failed: ${dbError.message}`)
        }

        // Merge
        const dbFileNames = new Set(dbBackups.map(b => b.fileName).filter(Boolean))
        const combined = [
            ...dbBackups,
            ...filesystemBackups.filter(fb => !dbFileNames.has(fb.fileName))
        ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

        const finalBackups = combined.slice(0, limit)
        // console.log(`[BackupHistory] Returning ${finalBackups.length} records`)

        return { success: true, backups: finalBackups }

    } catch (error: any) {
        console.error("[BackupHistory] Fatal error:", error)
        return { error: "Failed to fetch backup history: " + error.message }
    }
}

/**
 * Trigger a manual database backup
 */
/**
 * Trigger a manual database backup (SQLite File Copy)
 */
export async function triggerManualBackup(scope: 'FULL' | 'COMPANY' = 'FULL', dbType: 'AUTO' | 'POSTGRES' | 'SQLITE' = 'AUTO') {
    const user = await getUserProfile()
    if (!user) {
        return { error: "Unauthorized" }
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
        return { error: "Unauthorized" }
    }

    const companyId = scope === 'COMPANY' ? user.companyId : null

    // 1. Determine Database Type FIRST
    const sqliteUrl = process.env.SQLITE_DATABASE_URL
    const dbUrl = process.env.DATABASE_URL

    let isPostgres = false

    if (dbType === 'POSTGRES') {
        isPostgres = true
    } else if (dbType === 'SQLITE') {
        isPostgres = false
    } else {
        // AUTO detection - PRIORITIZE PORTGRES on web (where DATABASE_URL is set)
        if (dbUrl && (dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:"))) {
            isPostgres = true
        } else if (sqliteUrl && sqliteUrl.startsWith("file:")) {
            isPostgres = false
        } else if (dbUrl && dbUrl.startsWith("file:")) {
            isPostgres = false
        } else {
            return { error: "Invalid Database Configuration" }
        }
    }

    // Get the correct database client based on backup type
    const db = getDbClient(isPostgres) as any

    try {
        await ensureBackupDir()

        // Create backup log entry using the correct client
        const backupLog = await db.backupLog.create({
            data: {
                type: 'MANUAL',
                scope: scope,
                companyId: companyId,
                status: 'IN_PROGRESS',
                triggeredById: user.id
            }
        })

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

        // ---------------------------------------------------------
        // POSTGRES BACKUP STRATEGY
        // ---------------------------------------------------------
        if (isPostgres) {
            const fileName = `backup_${timestamp}.sql`
            const filePath = path.join(BACKUP_DIR, fileName)
            const connectionString = dbUrl! // Verified above

            try {
                // Find compatible pg_dump
                let pgDumpCmd = 'pg_dump' // Default

                // Common paths on MacOS for newer Postgres versions (prioritize latest)
                const candidatePaths = [
                    // Postgres 18 (matching your server version)
                    '/opt/homebrew/opt/postgresql@18/bin/pg_dump',
                    '/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump',
                    // Postgres.app latest symlink
                    '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
                    // Postgres 17 fallback
                    '/opt/homebrew/opt/postgresql@17/bin/pg_dump',
                    '/Applications/Postgres.app/Contents/Versions/17/bin/pg_dump',
                    // Postgres 16 fallback (may not work with server 18)
                    '/opt/homebrew/opt/postgresql@16/bin/pg_dump',
                    '/Applications/Postgres.app/Contents/Versions/16/bin/pg_dump',
                    // Generic Homebrew paths
                    '/opt/homebrew/bin/pg_dump',
                    '/usr/local/bin/pg_dump'
                ]

                // Use the first one that exists
                for (const p of candidatePaths) {
                    if (fs.existsSync(p)) {
                        pgDumpCmd = `"${p}"`
                        // console.log("Found pg_dump at:", p)
                        break
                    }
                }

                // Construct pg_dump command
                // pg_dump "connection_string" -F p -f "file_path"
                // We wrap connection string in quotes to handle special chars
                const cmd = `${pgDumpCmd} "${connectionString}" -F p -f "${filePath}"`

                // Execute
                await new Promise((resolve, reject) => {
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error("pg_dump error:", stderr)
                            reject(error)
                        } else {
                            resolve(stdout)
                        }
                    })
                })

                // Get file size
                if (!fs.existsSync(filePath)) throw new Error("Backup file not created")
                const stats = fs.statSync(filePath)

                // Update Success
                await db.backupLog.update({
                    where: { id: backupLog.id },
                    data: {
                        status: 'COMPLETED',
                        filePath: filePath,
                        fileName: fileName,
                        fileSize: stats.size,
                        completedAt: new Date()
                    }
                })

                revalidatePath('/dashboard/settings/backup')
                return {
                    success: true,
                    message: "Postgres backup completed successfully",
                    backup: { id: backupLog.id, fileName, fileSize: stats.size }
                }

            } catch (pgError: any) {
                console.error("Postgres backup failed:", pgError)
                await db.backupLog.update({
                    where: { id: backupLog.id },
                    data: { status: 'FAILED', errorMessage: pgError.message || 'pg_dump failed', completedAt: new Date() }
                })
                return { error: "Backup failed: " + (pgError.message || "pg_dump execution failed") }
            }
        }

        // ---------------------------------------------------------
        // SQLITE BACKUP STRATEGY
        // ---------------------------------------------------------
        else {
            const fileName = `backup_${timestamp}.sqlite`
            const filePath = path.join(BACKUP_DIR, fileName)

            // Resolve DB Path
            const activeUrl = (sqliteUrl && sqliteUrl.startsWith("file:")) ? sqliteUrl : dbUrl!
            const relativePath = activeUrl.replace("file:", "").replace("./", "")
            // For relative paths, always look in prisma/ directory (standard Prisma location)
            const distinctDbPath = relativePath.startsWith('/')
                ? relativePath
                : path.resolve(process.cwd(), 'prisma', relativePath)

            try {
                if (!fs.existsSync(distinctDbPath)) {
                    throw new Error(`Database file not found at ${distinctDbPath}`)
                }

                fs.copyFileSync(distinctDbPath, filePath)

                const stats = fs.statSync(filePath)

                await db.backupLog.update({
                    where: { id: backupLog.id },
                    data: {
                        status: 'COMPLETED',
                        filePath: filePath,
                        fileName: fileName,
                        fileSize: stats.size,
                        completedAt: new Date()
                    }
                })

                revalidatePath('/dashboard/settings/backup')
                return {
                    success: true,
                    message: "SQLite backup completed successfully",
                    backup: { id: backupLog.id, fileName, fileSize: stats.size }
                }
            } catch (copyError: any) {
                console.error("SQLite backup failed:", copyError)
                await db.backupLog.update({
                    where: { id: backupLog.id },
                    data: { status: 'FAILED', errorMessage: copyError.message || 'File copy failed', completedAt: new Date() }
                })
                return { error: "Backup failed: " + copyError.message }
            }
        }

    } catch (error) {
        console.error("Error triggering backup:", error)
        return { error: "Failed to initiate backup" }
    }
}

/**
 * Sync local database to online cloud database
 */
/**
 * Sync local database to online cloud database (Deprecated for SQLite)
 /**
 * Full DB Overwrite - pg_dump local Postgres and restore to online database
 * This is a DESTRUCTIVE operation that completely replaces the online database
 */
export async function syncToCloud(targetUrl?: string) {
    const user = await getUserProfile()
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Unauthorized" }
    }

    try {
        const localDbUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '')
        const onlineDbUrl = targetUrl || process.env.ONLINE_DATABASE_URL || ''

        if (!localDbUrl || !localDbUrl.startsWith('postgres')) {
            return { error: "Local DATABASE_URL is not a valid Postgres connection" }
        }

        if (!onlineDbUrl || !onlineDbUrl.startsWith('postgres')) {
            return { error: "ONLINE_DATABASE_URL is not configured or invalid" }
        }

        // Find pg_dump and psql executables
        const candidatePaths = [
            '/opt/homebrew/opt/postgresql@18/bin',
            '/Applications/Postgres.app/Contents/Versions/latest/bin',
            '/opt/homebrew/opt/postgresql@17/bin',
            '/Applications/Postgres.app/Contents/Versions/17/bin',
            '/opt/homebrew/opt/postgresql@16/bin',
            '/Applications/Postgres.app/Contents/Versions/16/bin',
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin'
        ]

        let pgBinPath = ''
        for (const p of candidatePaths) {
            if (fs.existsSync(path.join(p, 'pg_dump'))) {
                pgBinPath = p
                break
            }
        }

        if (!pgBinPath) {
            return { error: "Could not find pg_dump. Please install PostgreSQL." }
        }

        const pgDump = path.join(pgBinPath, 'pg_dump')
        const psql = path.join(pgBinPath, 'psql')

        // Create temp file for the dump
        const tempDumpFile = path.join(os.tmpdir(), `full_sync_${Date.now()}.sql`)

        // console.log("[FullSync] Starting pg_dump from local database...")

        // Step 1: Dump local database (schema + data, clean format)
        const dumpCmd = `"${pgDump}" "${localDbUrl}" --clean --if-exists --no-owner --no-acl -F p -f "${tempDumpFile}"`

        await new Promise<void>((resolve, reject) => {
            exec(dumpCmd, (error, stdout, stderr) => {
                if (error) {
                    console.error("pg_dump error:", stderr)
                    reject(new Error(`pg_dump failed: ${stderr || error.message}`))
                } else {
                    // console.log("[FullSync] pg_dump completed successfully")
                    resolve()
                }
            })
        })

        // Verify dump file was created
        if (!fs.existsSync(tempDumpFile)) {
            return { error: "pg_dump did not create output file" }
        }

        const dumpStats = fs.statSync(tempDumpFile)
        // console.log(`[FullSync] Dump file size: ${dumpStats.size} bytes`)

        // Step 2: Restore to online database
        // console.log("[FullSync] Restoring to online database...")

        const restoreCmd = `"${psql}" "${onlineDbUrl}" -f "${tempDumpFile}"`

        await new Promise<void>((resolve, reject) => {
            exec(restoreCmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
                // psql may output warnings/notices to stderr even on success
                if (error && !stderr.includes('already exists') && !stderr.includes('NOTICE')) {
                    console.error("psql restore error:", stderr)
                    reject(new Error(`Restore failed: ${stderr || error.message}`))
                } else {
                    // console.log("[FullSync] Restore completed")
                    if (stderr) console.log("[FullSync] Restore warnings:", stderr.slice(0, 500))
                    resolve()
                }
            })
        })

        // Cleanup temp file
        try {
            fs.unlinkSync(tempDumpFile)
        } catch (e) {
            console.log("[FullSync] Could not delete temp file:", tempDumpFile)
        }

        return {
            success: true,
            message: `Full database sync completed! Dumped ${Math.round(dumpStats.size / 1024)} KB of data to online database.`
        }

    } catch (error: any) {
        console.error("[FullSync] Error:", error)
        return { error: "Full sync failed: " + error.message }
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
    const user = await getUserProfile()
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Only Super Admin or Business Owner can delete backups" }
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
    const user = await getUserProfile()
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
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
    const user = await getUserProfile()
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
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
 * Run cleanup of old backups - keeps top 3 latest for each type (Postgres and SQLite)
 */
export async function cleanupOldBackups() {
    const user = await getUserProfile()
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Unauthorized" }
    }

    try {
        await ensureBackupDir()
        let deletedCount = 0

        // Get all backup files from filesystem
        const files = fs.readdirSync(BACKUP_DIR)

        // Separate by type
        const postgresFiles = files
            .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
            .sort((a, b) => b.localeCompare(a)) // Newest first (timestamps are ISO format)

        const sqliteFiles = files
            .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
            .sort((a, b) => b.localeCompare(a)) // Newest first

        // Keep top 3 for Postgres, delete the rest
        const postgresToDelete = postgresFiles.slice(3)
        for (const file of postgresToDelete) {
            const filePath = path.join(BACKUP_DIR, file)
            try {
                fs.unlinkSync(filePath)
                deletedCount++
            } catch (e) {
                console.error(`Failed to delete ${file}:`, e)
            }
        }

        // Keep top 3 for SQLite, delete the rest
        const sqliteToDelete = sqliteFiles.slice(3)
        for (const file of sqliteToDelete) {
            const filePath = path.join(BACKUP_DIR, file)
            try {
                fs.unlinkSync(filePath)
                deletedCount++
            } catch (e) {
                console.error(`Failed to delete ${file}:`, e)
            }
        }

        // Also clean up database records for files that no longer exist
        const allBackupLogs = await prisma.backupLog.findMany({
            where: { status: 'COMPLETED' }
        })

        for (const log of allBackupLogs) {
            if (log.filePath && !fs.existsSync(log.filePath)) {
                await prisma.backupLog.delete({ where: { id: log.id } })
            }
        }

        revalidatePath('/dashboard/settings/backup')
        return {
            success: true,
            message: `Cleaned up ${deletedCount} old backups. Kept 3 latest Postgres and 3 latest SQLite backups.`
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
 * Perform the actual scheduled backup - supports both Postgres and SQLite
 */
async function performScheduledBackup(scheduleId: string, currentSchedule: any) {
    try {
        await ensureBackupDir()

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const dbUrl = process.env.DATABASE_URL || ''
        const sqliteUrl = process.env.SQLITE_DATABASE_URL || ''

        // Detect database type - prefer Postgres for web deployments
        const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:")

        const fileName = isPostgres
            ? `backup_${timestamp}.sql`
            : `backup_${timestamp}.sqlite`
        const filePath = path.join(BACKUP_DIR, fileName)

        // Create log entry
        const backupLog = await prisma.backupLog.create({
            data: {
                type: 'SCHEDULED',
                scope: 'FULL',
                status: 'IN_PROGRESS'
            }
        })

        try {
            if (isPostgres) {
                // Postgres backup using pg_dump
                const candidatePaths = [
                    '/opt/homebrew/opt/postgresql@18/bin/pg_dump',
                    '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
                    '/opt/homebrew/opt/postgresql@17/bin/pg_dump',
                    '/opt/homebrew/opt/postgresql@16/bin/pg_dump',
                    '/opt/homebrew/bin/pg_dump',
                    '/usr/local/bin/pg_dump',
                    'pg_dump'
                ]

                let pgDumpCmd = 'pg_dump'
                for (const p of candidatePaths) {
                    if (fs.existsSync(p)) {
                        pgDumpCmd = `"${p}"`
                        break
                    }
                }

                const cmd = `${pgDumpCmd} "${dbUrl}" -F p -f "${filePath}"`
                await new Promise((resolve, reject) => {
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error("pg_dump error:", stderr)
                            reject(error)
                        } else {
                            resolve(stdout)
                        }
                    })
                })

            } else {
                // SQLite backup using file copy
                const activeUrl = (sqliteUrl && sqliteUrl.startsWith("file:")) ? sqliteUrl : dbUrl
                const relativePath = activeUrl.replace("file:", "").replace("./", "")
                const distinctDbPath = relativePath.startsWith('/')
                    ? relativePath
                    : path.resolve(process.cwd(), 'prisma', relativePath)

                if (!fs.existsSync(distinctDbPath)) {
                    throw new Error(`Database file not found at ${distinctDbPath}`)
                }

                fs.copyFileSync(distinctDbPath, filePath)
            }

            // Verify file was created and get size
            if (!fs.existsSync(filePath)) {
                throw new Error("Backup file was not created")
            }

            const stats = fs.statSync(filePath)

            // Update log to completed
            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'COMPLETED',
                    filePath,
                    fileName,
                    fileSize: stats.size,
                    completedAt: new Date()
                }
            })

            console.log(`Scheduled backup completed: ${fileName} (${stats.size} bytes)`)

        } catch (execError: any) {
            console.error("Scheduled backup failed:", execError)

            await prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'FAILED',
                    errorMessage: execError.message || 'Unknown error',
                    completedAt: new Date()
                }
            })
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
        console.error("Critical error in performScheduledBackup:", error)
    }
}
