"use client"

import { useState } from "react"
import { Check, Utensils, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveServiceMode } from "@/app/actions/setup"
import { useRouter } from "next/navigation"

export default function SetupModePage() {
    const [selected, setSelected] = useState<'table' | 'counter' | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleContinue = async () => {
        if (!selected) return
        setLoading(true)
        await saveServiceMode(selected === 'table')
        router.push("/dashboard") // Or dashboard/tables if table mode
    }

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">Choose Service Mode</h1>
                    <p className="text-gray-500">Select how you want to operate your point of sale. You can change this later.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Table Service Card */}
                    <button
                        onClick={() => setSelected('table')}
                        className={cn(
                            "relative p-8 rounded-2xl border-2 text-left transition-all hover:shadow-lg group",
                            selected === 'table'
                                ? "border-orange-600 bg-white ring-4 ring-orange-50"
                                : "border-gray-200 bg-white hover:border-orange-200"
                        )}
                    >
                        {selected === 'table' && (
                            <div className="absolute top-4 right-4 h-6 w-6 bg-orange-600 rounded-full flex items-center justify-center text-white">
                                <Check className="h-4 w-4" />
                            </div>
                        )}
                        <div className={cn(
                            "h-14 w-14 rounded-xl flex items-center justify-center mb-6 transition-colors",
                            selected === 'table' ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-600"
                        )}>
                            <Utensils className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Table Service</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Best for dine-in restaurants. Manage tables, track occupancy, and assign orders to specific tables.
                        </p>
                    </button>

                    {/* Counter Service Card */}
                    <button
                        onClick={() => setSelected('counter')}
                        className={cn(
                            "relative p-8 rounded-2xl border-2 text-left transition-all hover:shadow-lg group",
                            selected === 'counter'
                                ? "border-orange-600 bg-white ring-4 ring-orange-50"
                                : "border-gray-200 bg-white hover:border-orange-200"
                        )}
                    >
                        {selected === 'counter' && (
                            <div className="absolute top-4 right-4 h-6 w-6 bg-orange-600 rounded-full flex items-center justify-center text-white">
                                <Check className="h-4 w-4" />
                            </div>
                        )}
                        <div className={cn(
                            "h-14 w-14 rounded-xl flex items-center justify-center mb-6 transition-colors",
                            selected === 'counter' ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-600"
                        )}>
                            <ShoppingBag className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Counter Service</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Quick service workflow. Take orders directly at the counter without managing table assignments.
                        </p>
                    </button>
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!selected || loading}
                    className={cn(
                        "w-full max-w-xs mx-auto py-4 rounded-xl font-bold text-white shadow-lg shadow-orange-200 transition-all",
                        !selected || loading
                            ? "bg-gray-300 cursor-not-allowed shadow-none"
                            : "bg-orange-600 hover:bg-orange-700 active:scale-95"
                    )}
                >
                    {loading ? "Saving..." : "Continue"}
                </button>
            </div>
        </div>
    )
}
