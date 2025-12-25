export default function NotificationsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 flex gap-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
