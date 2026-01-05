export default function TaxesLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="h-8 w-48 bg-gray-200 rounded"></div>

            {/* Tax Configuration Form */}
            <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
                {/* Tax Toggle */}
                <div className="flex items-center justify-between py-4 border-b">
                    <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
                </div>

                {/* Tax Fields */}
                {[...Array(3)].map((_, i) => (
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
