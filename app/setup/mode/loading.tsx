import { Loader2 } from "lucide-react"

export default function ModeSetupLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="w-full max-w-2xl space-y-6 animate-pulse p-8">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="h-10 bg-gray-200 rounded w-64 mx-auto"></div>
                    <div className="h-5 bg-gray-200 rounded w-96 mx-auto"></div>
                </div>

                {/* Mode Cards */}
                <div className="grid grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-8 space-y-4">
                            <div className="h-16 w-16 bg-gray-200 rounded-lg mx-auto"></div>
                            <div className="h-6 bg-gray-200 rounded w-32 mx-auto"></div>
                            <div className="h-4 bg-gray-200 rounded mx-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
