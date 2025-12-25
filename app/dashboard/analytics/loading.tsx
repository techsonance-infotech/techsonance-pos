export default function AnalyticsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-48 bg-gray-200 rounded"></div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    )
}
