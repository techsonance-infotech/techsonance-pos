export default function HoldOrdersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                            <div className="h-5 bg-gray-200 rounded w-24"></div>
                            <div className="h-5 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-8 w-20 bg-gray-200 rounded"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
