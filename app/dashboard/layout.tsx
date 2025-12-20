import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SessionGuard } from "@/components/auth/session-guard"
import { getUserProfile } from "@/app/actions/user"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUserProfile()

    return (
        <SessionGuard>
            <div className="flex h-screen w-full overflow-hidden bg-white">
                <Sidebar />
                <div className="flex flex-1 flex-col h-full min-w-0">
                    <Header initialUser={user} />
                    <main className="flex-1 overflow-hidden p-6 bg-gray-50/50">
                        {children}
                    </main>
                </div>
            </div>
        </SessionGuard>
    )
}
