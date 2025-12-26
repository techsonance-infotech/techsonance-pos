export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div>
                <div className="h-9 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                <div className="h-5 bg-gray-100 rounded animate-pulse w-80" />
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                        <div className="inline-flex rounded-xl p-3 bg-gray-100 mb-4">
                            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-24" />
                            <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Quick Actions Skeleton */}
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-6" />
                    <div className="space-y-4">
                        <div className="h-14 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse" />
                        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                </div>

                {/* Recent Orders Skeleton */}
                <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-9 bg-gray-100 rounded animate-pulse w-20" />
                    </div>

                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-6 bg-gray-100 rounded-full animate-pulse w-20" />
                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                                    <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8 bg-white rounded-full p-4 shadow-lg border border-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
            </div>
        </div>
    )
}
