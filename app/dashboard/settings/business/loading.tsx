export default function BusinessSettingsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-48 bg-gray-200 rounded"></div>

            {/* Form */}
            <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                    <div className="h-32 w-32 bg-gray-200 rounded-lg"></div>
                </div>

                {/* Form Fields */}
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                ))}

                {/* Buttons */}
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-gray-200 rounded"></div>
                    <div className="h-10 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    )
}
