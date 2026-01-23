"use client"

import { useState, useEffect } from "react"
import { Home, Trash2, AlertTriangle, Package, ShoppingCart, LayoutGrid, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUserProfile } from "@/app/actions/user"
import { clearOrders, clearProducts, clearTables, clearAllData } from "@/app/actions/data-cleanup"
import { cn } from "@/lib/utils"

type CleanupOption = {
    id: string
    title: string
    description: string
    warning: string
    icon: any
    iconBgClass: string
    iconColor: string
    action: () => Promise<{ success: boolean; message: string }>
    isDangerous?: boolean
}

const cleanupOptions: CleanupOption[] = [
    {
        id: "orders",
        title: "Clear Orders",
        description: "Delete all orders (completed, cancelled, and held)",
        warning: "This will permanently delete all order history. This action cannot be undone.",
        icon: ShoppingCart,
        iconBgClass: "bg-orange-50",
        iconColor: "text-orange-600",
        action: clearOrders
    },
    {
        id: "products",
        title: "Clear Products & Categories",
        description: "Delete all products and their categories",
        warning: "This will permanently delete all products and categories. You will need to recreate your menu.",
        icon: Package,
        iconBgClass: "bg-blue-50",
        iconColor: "text-blue-600",
        action: clearProducts
    },
    {
        id: "tables",
        title: "Clear Tables",
        description: "Delete all table configurations",
        warning: "This will permanently delete all tables. You will need to recreate table layouts.",
        icon: LayoutGrid,
        iconBgClass: "bg-purple-50",
        iconColor: "text-purple-600",
        action: clearTables
    },
    {
        id: "all",
        title: "Clear All Data",
        description: "Nuclear option: Delete orders, products, categories, and tables",
        warning: "⚠️ DANGER: This will permanently delete ALL business data. This is irreversible!",
        icon: Trash2,
        iconBgClass: "bg-red-50",
        iconColor: "text-red-600",
        action: clearAllData,
        isDangerous: true
    }
]

function ConfirmationModal({
    isOpen,
    option,
    onClose,
    onConfirm,
    isLoading
}: {
    isOpen: boolean
    option: CleanupOption | null
    onClose: () => void
    onConfirm: () => void
    isLoading: boolean
}) {
    const [confirmText, setConfirmText] = useState("")
    const isConfirmValid = confirmText === "DELETE"

    useEffect(() => {
        if (!isOpen) setConfirmText("")
    }, [isOpen])

    if (!isOpen || !option) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", option.iconBgClass)}>
                        <AlertTriangle className={cn("h-6 w-6", option.isDangerous ? "text-red-600" : "text-orange-600")} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Confirm {option.title}</h3>
                        <p className="text-sm text-gray-500">This action is irreversible</p>
                    </div>
                </div>

                <div className={cn(
                    "p-4 rounded-xl mb-4",
                    option.isDangerous ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"
                )}>
                    <p className={cn(
                        "text-sm font-medium",
                        option.isDangerous ? "text-red-800" : "text-orange-800"
                    )}>
                        {option.warning}
                    </p>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">DELETE</span> to confirm
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                        placeholder="Type DELETE"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono"
                        disabled={isLoading}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isConfirmValid || isLoading}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                            isConfirmValid && !isLoading
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ResultToast({ message, isSuccess, onClose }: { message: string; isSuccess: boolean; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className={cn(
            "fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-lg z-50 flex items-center gap-3",
            isSuccess ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
            <span>{message}</span>
            <button onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
    )
}

export default function DataCleanupPage() {
    const router = useRouter()
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedOption, setSelectedOption] = useState<CleanupOption | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null)

    useEffect(() => {
        getUserProfile()
            .then(user => {
                if (!user) {
                    router.push('/login')
                    return
                }
                if (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER') {
                    router.push('/dashboard/settings')
                    return
                }
                setUserRole(user.role)
            })
            .catch(() => {
                router.push('/dashboard/settings')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [router])

    const handleCleanup = async () => {
        if (!selectedOption) return

        setIsProcessing(true)
        try {
            const result = await selectedOption.action()
            setToast({ message: result.message, isSuccess: result.success })
            if (result.success) {
                setSelectedOption(null)
            }
        } catch (error) {
            setToast({ message: "An unexpected error occurred", isSuccess: false })
        } finally {
            setIsProcessing(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!userRole) return null

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto space-y-8 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <a href="/dashboard/settings" className="hover:text-orange-600 transition-colors">Settings</a>
                <span>/</span>
                <span className="font-medium text-orange-600">Data Cleanup</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Trash2 className="h-8 w-8 text-red-500" />
                    Data Cleanup
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Permanently delete data from your POS system. <span className="text-red-600 font-medium">Use with caution!</span>
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-amber-800 mb-1">Important Notice</h3>
                    <p className="text-amber-700 text-sm">
                        Data cleanup operations are permanent and cannot be undone. Please ensure you have a backup before proceeding.
                        These actions are logged for audit purposes.
                    </p>
                </div>
            </div>

            {/* Cleanup Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cleanupOptions.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedOption(option)}
                        className={cn(
                            "flex flex-col items-start p-6 rounded-2xl border bg-white hover:shadow-lg transition-all text-left h-full group",
                            option.isDangerous
                                ? "border-red-200 hover:border-red-300"
                                : "border-gray-100 hover:border-orange-100"
                        )}
                    >
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                            option.iconBgClass
                        )}>
                            <option.icon className={cn("h-7 w-7", option.iconColor)} />
                        </div>

                        <h3 className={cn(
                            "text-lg font-bold mb-2 transition-colors",
                            option.isDangerous
                                ? "text-red-900 group-hover:text-red-600"
                                : "text-gray-900 group-hover:text-orange-600"
                        )}>
                            {option.title}
                        </h3>

                        <p className="text-gray-500 text-sm leading-relaxed mb-4">
                            {option.description}
                        </p>

                        <div className={cn(
                            "mt-auto px-3 py-1.5 rounded-lg text-xs font-medium",
                            option.isDangerous
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        )}>
                            {option.isDangerous ? "⚠️ High Risk" : "Requires Confirmation"}
                        </div>
                    </button>
                ))}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!selectedOption}
                option={selectedOption}
                onClose={() => setSelectedOption(null)}
                onConfirm={handleCleanup}
                isLoading={isProcessing}
            />

            {/* Toast Notification */}
            {toast && (
                <ResultToast
                    message={toast.message}
                    isSuccess={toast.isSuccess}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
