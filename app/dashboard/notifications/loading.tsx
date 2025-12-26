import { Bell, Loader2, Info, CheckCircle, Package, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function NotificationsLoading() {
    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.24))] gap-6">
            {/* Main Content */}
            <div className="flex-1 flex flex-col space-y-6 min-w-0">
                {/* Header Skeleton */}
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar Skeleton */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex gap-2">
                            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Notifications List Skeleton */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y divide-gray-50">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-6 flex gap-4 animate-pulse">
                                    <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="h-5 w-48 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                    </div>
                                    <div className="self-center">
                                        <div className="h-2.5 w-2.5 rounded-full bg-gray-200"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar Skeleton */}
            <div className="w-full lg:w-80 shrink-0">
                <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 sticky top-6">
                    <div className="h-6 w-48 bg-blue-200 rounded animate-pulse mb-6"></div>

                    <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-blue-200 shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 bg-blue-200 rounded"></div>
                                    <div className="h-3 w-full bg-blue-200 rounded"></div>
                                    <div className="h-3 w-3/4 bg-blue-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8 bg-white rounded-full shadow-lg p-4 border border-gray-200">
                <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
            </div>
        </div>
    )
}
