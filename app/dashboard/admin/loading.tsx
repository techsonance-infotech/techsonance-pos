export default function AdminLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-600">Loading admin panel...</p>
            </div>
        </div>
    )
}
