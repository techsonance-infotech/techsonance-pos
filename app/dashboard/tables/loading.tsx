export default function TablesLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Tables Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="bg-white shadow-sm rounded-lg p-6 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-20 mx-auto"></div>
                        <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
