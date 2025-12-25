export default function RecentOrdersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-gray-200 rounded"></div>
                    <div className="h-10 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex gap-4">
                <div className="h-10 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-48 bg-gray-200 rounded"></div>
            </div>

            {/* Table Skeleton */}
            <div className="border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-100 p-4 flex gap-4">
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 rounded ml-auto"></div>
                </div>

                {/* Table Rows */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-t flex gap-4 items-center">
                        <div className="h-5 w-24 bg-gray-200 rounded"></div>
                        <div className="h-5 w-32 bg-gray-200 rounded"></div>
                        <div className="h-5 w-24 bg-gray-200 rounded"></div>
                        <div className="h-5 w-24 bg-gray-200 rounded"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded ml-auto"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
