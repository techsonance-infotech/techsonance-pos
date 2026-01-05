'use server'

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_role')
    cookieStore.delete('session_user_id')
    redirect("/")
}
