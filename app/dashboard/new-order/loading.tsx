export default function NewOrderLoading() {
    return (
        <div className="h-full flex gap-4 animate-pulse">
            {/* Categories Sidebar Skeleton */}
            <div className="w-64 space-y-2">
                <div className="h-10 bg-gray-200 rounded"></div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
            </div>

            {/* Products Grid Skeleton */}
            <div className="flex-1 space-y-4">
                <div className="h-10 bg-gray-200 rounded w-48"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-5 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar Skeleton */}
            <div className="w-80 border-l pl-4 space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
                <div className="h-12 bg-gray-200 rounded mt-auto"></div>
            </div>
        </div>
    )
}
