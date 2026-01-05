"use client"

import { useEffect, useState } from "react"
import { Play, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getHeldOrders, deleteOrder } from "@/app/actions/orders"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import HoldOrdersLoading from "./loading"

export default function HoldOrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const router = useRouter()
    const { currency } = useCurrency()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const data = await getHeldOrders()
        setOrders(data)
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this held order?")) {
            setDeletingId(id)
            try {
                await deleteOrder(id)
                loadData()
            } finally {
                setDeletingId(null)
            }
        }
    }

    const handleResume = (id: string) => {
        router.push(`/dashboard/new-order?resumeId=${id}`)
    }

    if (loading) return <HoldOrdersLoading />

    return (
        <div className="flex-1 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Hold Orders</h1>
                <p className="text-gray-500">Manage your held orders (KOT)</p>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                        {/* Card Header - Light Purple */}
                        <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-purple-700 text-lg">{order.kotNo}</h3>
                                {(order.customerName || order.customerMobile) && (
                                    <div className="text-xs text-gray-600 mt-1 flex flex-col">
                                        {order.customerName && <span className="font-medium">{order.customerName}</span>}
                                        {order.customerMobile && <span>{order.customerMobile}</span>}
                                        {order.tableName && <span className="text-purple-600 mt-0.5 font-semibold">Table: {order.tableName}</span>}
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-2">
                                    {new Date(order.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-purple-700">{formatCurrency(order.totalAmount, currency.symbol)}</span>
                            </div>
                        </div>

                        {/* Card Body - Items */}
                        <div className="p-4 space-y-3 min-h-[100px]">
                            {Array.isArray(order.items) && order.items.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm text-gray-700">
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-gray-900">{item.quantity}x</span>
                                        <span>{item.name}</span>
                                    </div>
                                    <span className="text-gray-500">{formatCurrency(item.unitPrice, currency.symbol)}</span>
                                </div>
                            ))}
                            {Array.isArray(order.items) && order.items.length > 3 && (
                                <p className="text-xs text-gray-400 italic">+{order.items.length - 3} more items...</p>
                            )}
                        </div>

                        {/* Card Footer - Actions */}
                        <div className="p-4 pt-0 flex gap-3">
                            <Button
                                onClick={() => handleResume(order.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11 rounded-lg gap-2"
                            >
                                <Play className="h-4 w-4 fill-current" /> Resume
                            </Button>
                            <Button
                                onClick={() => handleDelete(order.id)}
                                variant="ghost"
                                className="h-11 w-11 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg shrink-0"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {orders.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                    <p>No held orders found.</p>
                </div>
            )}
        </div>
    )
}
