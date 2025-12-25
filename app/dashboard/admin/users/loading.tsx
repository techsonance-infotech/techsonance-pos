export default function UsersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="h-10 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-48 bg-gray-200 rounded"></div>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4 flex gap-4">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-5 w-48 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 rounded ml-auto"></div>
                </div>

                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-t flex gap-4 items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
