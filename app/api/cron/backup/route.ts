import { NextResponse } from "next/server"
import { checkAndRunDueScheduledBackup } from "@/app/actions/backup"

export const dynamic = 'force-dynamic' // Ensure it's not cached

export async function GET(request: Request) {
    // Optional: Add a secret token check for security
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 })
    // }

    try {
        const result = await checkAndRunDueScheduledBackup()
        return NextResponse.json(result)
    } catch (error) {
        console.error("Cron backup failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
