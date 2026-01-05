import { Home, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function SettingsLoading() {
    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Header Skeleton */}
            <div>
                <div className="h-9 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-6 w-96 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Settings Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <Card key={i} className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-white shadow-sm h-full animate-pulse">
                        <div className="h-14 w-14 rounded-2xl bg-gray-200 mb-6"></div>
                        <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                    </Card>
                ))}
            </div>

            {/* System Information Panel Skeleton */}
            <div className="mt-8 bg-gray-50/50 rounded-2xl border border-gray-100 p-8">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i}>
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8 bg-white rounded-full shadow-lg p-4 border border-gray-200">
                <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
            </div>
        </div>
    )
}
