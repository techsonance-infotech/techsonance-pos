export default function PreferencesLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-48 bg-gray-200 rounded"></div>

            {/* Preferences Form */}
            <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b last:border-0">
                        <div className="space-y-2 flex-1">
                            <div className="h-5 bg-gray-200 rounded w-48"></div>
                            <div className="h-4 bg-gray-200 rounded w-64"></div>
                        </div>
                        <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
