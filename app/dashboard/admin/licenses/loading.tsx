export default function LicensesLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white shadow-sm rounded-lg p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                ))}
            </div>

            {/* Licenses Table */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4 flex gap-4">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 rounded ml-auto"></div>
                </div>

                {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border-t border-gray-100 flex gap-4 items-center">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                        <div className="h-5 bg-gray-200 rounded w-24"></div>
                        <div className="h-5 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded ml-auto"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
