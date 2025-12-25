export default function SettingsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-32 bg-gray-200 rounded"></div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3 hover:shadow-lg transition-shadow">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
