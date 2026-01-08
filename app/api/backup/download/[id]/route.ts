import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: backupId } = await params

    // Verify authentication
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // Get user and verify role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, companyId: true }
        })

        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Get backup
        const backup = await prisma.backupLog.findUnique({
            where: { id: backupId }
        })

        if (!backup) {
            return NextResponse.json({ error: "Backup not found" }, { status: 404 })
        }

        // Check access for non-Super Admins
        if (user.role !== 'SUPER_ADMIN' && backup.companyId !== user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        if (backup.status !== 'COMPLETED' || !backup.filePath) {
            return NextResponse.json({ error: "Backup file not available" }, { status: 400 })
        }

        // Check if file exists
        if (!fs.existsSync(backup.filePath)) {
            return NextResponse.json({ error: "Backup file not found on disk" }, { status: 404 })
        }

        // Read file and stream it
        const fileBuffer = fs.readFileSync(backup.filePath)
        const fileName = backup.fileName || path.basename(backup.filePath)

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(fileBuffer.length)
            }
        })
    } catch (error) {
        console.error("Error downloading backup:", error)
        return NextResponse.json({ error: "Failed to download backup" }, { status: 500 })
    }
}
