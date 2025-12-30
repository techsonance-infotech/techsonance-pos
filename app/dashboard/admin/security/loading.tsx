export default function SecurityLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-48 bg-gray-200 rounded"></div>

            {/* Security Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kill Switch Card */}
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>

                {/* Maintenance Mode Card */}
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            </div>

            {/* Security Rules */}
            <div className="border rounded-lg p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="h-5 bg-gray-200 rounded w-48"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
