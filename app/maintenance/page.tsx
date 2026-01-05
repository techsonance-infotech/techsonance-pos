
export default function MaintenancePage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-gray-900">System Maintenance</h1>
                <p className="text-gray-500 max-w-md mx-auto">
                    The system is currently undergoing critical maintenance.
                    Please try again later.
                </p>
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md inline-block">
                    Only Administrators can access the system at this time.
                </div>
            </div>
        </div>
    )
}
