export default function MenuLoading() {
    return (
        <div className="flex h-[calc(100vh-theme(spacing.20))] gap-6 overflow-hidden">
            {/* LEFT: Categories Sidebar Skeleton */}
            <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100">
                            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                            <div className="flex-1 space-y-1">
                                <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                                <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                            </div>
                            <div className="h-7 w-7 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Products Grid Skeleton */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-64" />
                    </div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
                                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 flex-1">
                                            <div className="h-5 bg-gray-200 rounded animate-pulse w-48" />
                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-64" />
                                        </div>
                                        <div className="h-5 bg-orange-200 rounded animate-pulse w-16" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-6 bg-gray-100 rounded animate-pulse w-24" />
                                        <div className="flex items-center gap-2 ml-auto">
                                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                                        </div>
                                    </div>
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
