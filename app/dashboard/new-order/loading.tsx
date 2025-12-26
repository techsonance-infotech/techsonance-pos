export default function NewOrderLoading() {
    return (
        <div className="h-[calc(100vh-theme(spacing.20))] flex gap-6 p-6 overflow-hidden">
            {/* LEFT: Categories & Products */}
            <div className="flex-1 flex gap-4 min-w-0 overflow-hidden">
                {/* Categories Sidebar Skeleton */}
                <div className="w-56 hidden lg:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
                    <div className="p-4 border-b border-gray-100">
                        <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>

                {/* Products Grid Skeleton */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-full sm:w-64" />
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
                                    <div className="mt-auto self-end">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Cart Panel Skeleton */}
            <div className="w-full md:w-[380px] flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden shrink-0">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                </div>

                {/* Guest Info */}
                <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50/50">
                    <div className="h-9 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-9 bg-gray-200 rounded-lg animate-pulse" />
                </div>

                {/* Cart Items Area */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse mb-3" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                    </div>
                </div>

                {/* Footer Totals Skeleton */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                    </div>
                    <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                    </div>
                    <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                        <div className="h-7 bg-gray-200 rounded animate-pulse w-20" />
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div className="h-6 bg-gray-200 rounded animate-pulse w-12" />
                            <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8 bg-white rounded-full p-4 shadow-lg border border-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
            </div>
        </div>
    )
}
