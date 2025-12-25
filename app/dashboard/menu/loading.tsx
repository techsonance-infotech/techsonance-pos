export default function MenuLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-2 border-b">
                <div className="h-10 w-24 bg-gray-200 rounded-t"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-t"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-t"></div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="flex gap-2">
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
