import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SessionGuard } from "@/components/auth/session-guard"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionGuard>
            <div className="flex h-screen w-full overflow-hidden bg-white">
                <Sidebar />
                <div className="flex flex-1 flex-col h-full min-w-0">
                    <Header />
                    <main className="flex-1 overflow-hidden p-6 bg-gray-50/50">
                        {children}
                    </main>
                </div>
            </div>
        </SessionGuard>
    )
}
