export default function HoldOrdersLoading() {
    return (
        <div className="flex-1 space-y-6">
            {/* Header Skeleton */}
            <div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                <div className="h-5 bg-gray-100 rounded animate-pulse w-64" />
            </div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white shadow-sm rounded-xl overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-1">
                                    <div className="h-6 bg-purple-200 rounded animate-pulse w-24" />
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-28" />
                                </div>
                                <div className="h-6 bg-purple-200 rounded animate-pulse w-20" />
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3 min-h-[100px]">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="flex justify-between">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                                </div>
                            ))}
                        </div>

                        {/* Card Footer */}
                        <div className="p-4 pt-0 flex gap-3">
                            <div className="flex-1 h-11 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-11 w-11 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8 bg-white rounded-full p-4 shadow-lg border border-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            </div>
        </div>
    )
}
