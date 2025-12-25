import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
                <p className="text-sm text-gray-600">Loading dashboard...</p>
            </div>
        </div>
    )
}
