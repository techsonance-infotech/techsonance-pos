export default function PrintersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Printers List */}
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-6 bg-gray-200 rounded w-48"></div>
                                <div className="h-4 bg-gray-200 rounded w-64"></div>
                            </div>
                            <div className="flex gap-2">
                                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
