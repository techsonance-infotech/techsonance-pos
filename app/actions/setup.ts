'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function saveServiceMode(isTableMode: boolean) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        throw new Error("Unauthorized")
    }

    await prisma.user.update({
        where: { id: userId },
        data: { tableMode: isTableMode }
    })

    if (isTableMode) {
        redirect("/dashboard/tables")
    } else {
        redirect("/dashboard")
    }
}
