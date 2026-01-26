"use client"

import { useState, useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { renderToStaticMarkup } from 'react-dom/server'
import { Search, Calendar, ClipboardList, Eye, Printer, Edit, Trash2, Play, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { ReceiptTemplate } from "@/components/pos/receipt-template"
import { convertOrderToHeld, deleteOrder, getOrder } from "@/app/actions/orders"
import { getRecentOrdersPageData } from "@/app/actions/pos"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import RecentOrdersLoading from "./loading"
import { useNetworkStatus } from "@/hooks/use-network-status"

export function RecentOrdersClient() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const viewOrderId = searchParams.get("viewOrderId")
    const isOnline = useNetworkStatus()

    const { currency } = useCurrency()
    const [searchQuery, setSearchQuery] = useState("")
    const [dateFilter, setDateFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [printOrder, setPrintOrder] = useState<any | null>(null) // For Printing
    const [businessDetails, setBusinessDetails] = useState<any>(null)
    const [storeDetails, setStoreDetails] = useState<any>(null)
    const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<any | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [editedOrders, setEditedOrders] = useState<Set<string>>(new Set()) // Track edited orders
    const printRef = useRef<HTMLDivElement>(null) // Ref for print component

    // ... helper functions ...

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOnline) loadData()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, dateFilter, statusFilter, currentPage, isOnline])

    async function loadData() {
        setLoading(true)

        // Offline First ?? No, Online First for listing to get fresh status
        if (!isOnline) {
            console.log("Offline mode: Loading local orders")
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const localOrders = await getPOSService().getRecentOrders()
                setOrders(localOrders) // Load ALL for client filtering
            } catch (innerError) {
                console.error("Failed to load local orders", innerError)
            } finally {
                setLoading(false)
            }
            return
        }

        try {
            // Try fetching from Server (Filtered)
            const data = await getRecentOrdersPageData({
                search: searchQuery,
                status: statusFilter,
                date: dateFilter,
                page: currentPage
            })

            if (data) {
                setOrders(data.orders)
                setTotalPages(data.totalPages || 1)
                setBusinessDetails(data.businessDetails)
                setStoreDetails(data.storeDetails)
            }
        } catch (error) {
            // Fallback to Offline Data
            console.log("Offline mode (fallback): Loading local orders")
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const posService = getPOSService()
                const localOrders = await posService.getRecentOrders()
                setOrders(localOrders)
            } catch (innerError) {
                console.error("Failed to load local orders", innerError)
            }
        } finally {
            setLoading(false)
        }
    }

    // Filter Logic (Client-side ONLY if Offline)
    const filteredOrders = isOnline
        ? orders // Already filtered by server
        : orders.filter((order: any) => {
            const matchesSearch =
                order.kotNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (order.customerMobile && order.customerMobile.includes(searchQuery))

            // Simple date string match for YYYY-MM-DD
            const matchesDate = dateFilter ? order.createdAt.toString().startsWith(dateFilter) : true

            // Status Match
            const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter

            return matchesSearch && matchesDate && matchesStatus
        })

    // Print handler using react-to-print (Web Fallback)
    const handleWebPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Receipt-${printOrder?.kotNo || 'Order'}`,
        pageStyle: `
            @page {
                size: 80mm auto;
                margin: 0mm;
            }
            @media print {
                body {
                    margin: 0mm;
                }
            }
        `,
        onAfterPrint: () => {
            setTimeout(() => setPrintOrder(null), 500)
        }
    })

    // Unified Print Handler
    const handlePrint = async (orderToPrint?: any) => {
        // use provided order or fallback to selectedOrder (if viewing details)
        const order = orderToPrint || selectedOrder
        if (!order) return

        // 1. Set state to render the hidden receipt template
        setPrintOrder(order)

        // 2. Wait for render (short delay)
        setTimeout(async () => {
            // Check if running in Electron
            if ((window as any).electron && (window as any).electron.isDesktop) {
                try {
                    const html = renderToStaticMarkup(
                        <ReceiptTemplate
                            order={order}
                            businessDetails={businessDetails}
                            storeDetails={storeDetails}
                        />
                    )
                    await (window as any).electron.printReceipt(html)
                    setPrintOrder(null)
                } catch (e) {
                    console.error("Silent print failed", e)
                    handleWebPrint() // Fallback knows ref is ready now
                }
            } else {
                handleWebPrint() // Fallback knows ref is ready now
            }
        }, 100)
    }

    // Handle Edit Order (Convert to HELD)
    async function handleEditOrder(orderId: string) {
        setActionLoading(true)
        try {
            const result = await convertOrderToHeld(orderId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.message || "Order moved to held orders")
                // Mark this order as edited to enable Resume button
                setEditedOrders(prev => new Set(prev).add(orderId))
                // Don't refresh - keep order visible with Resume enabled
            }
        } catch (error) {
            toast.error("Failed to edit order")
        } finally {
            setActionLoading(false)
        }
    }

    // Handle Delete Order
    async function handleDeleteOrder(orderId: string) {
        setActionLoading(true)
        try {
            const result = await deleteOrder(orderId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Order deleted successfully")
                await loadData() // Refresh the list
                setDeleteConfirmOrder(null)
            }
        } catch (error) {
            toast.error("Failed to delete order")
        } finally {
            setActionLoading(false)
        }
    }

    // Handle Resume Order (Navigate to New Order page)
    function handleResumeOrder(orderId: string) {
        router.push(`/dashboard/new-order?resumeOrderId=${orderId}`)
    }

    return (
        <>
            <div className="flex-1 space-y-6 no-print">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recent Orders</h1>
                    <p className="text-gray-500">View and manage orders history</p>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by KOT No, Customer Name, Mobile..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setCurrentPage(1) // Reset page on search
                            }}
                            className="pl-10 h-11 bg-white"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="ALL">All Orders</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="w-full md:w-auto">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="pl-10 h-11 bg-white min-w-[200px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 min-h-[400px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                            <ClipboardList className="h-10 w-10 text-orange-200" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">No Orders Found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            No orders match your current filters.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">KOT No</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Items</th>
                                        <th className="px-6 py-4 text-right">GST</th>
                                        <th className="px-6 py-4 text-right">Discount</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Reference</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.map((order: any) => (
                                        <tr key={order.id} className={`hover:bg-gray-50/50 transition-colors ${order.status === 'CANCELLED' ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-900">{order.kotNo}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${order.status === 'CANCELLED'
                                                    ? 'bg-red-100 text-red-800 border-red-200'
                                                    : 'bg-green-100 text-green-800 border-green-200'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(order.updatedAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {order.customerName ? (
                                                    <div>
                                                        <p className="font-medium text-gray-900">{order.customerName}</p>
                                                        <p className="text-xs text-gray-500">{order.customerMobile}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Walk-in</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[200px] truncate text-gray-600" title={Array.isArray(order.items) ? order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') : ''}>
                                                    {Array.isArray(order.items) ? `${order.items.length} items` : '0 items'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                ₹{order.taxAmount ? Number(order.taxAmount).toFixed(2) : '0.00'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-green-600">
                                                {order.discountAmount ? `-₹${Number(order.discountAmount).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                ₹{order.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {order.tableName ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {order.tableName}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="View Details"
                                                        disabled={actionLoading}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {order.status !== 'CANCELLED' && (
                                                        <button
                                                            onClick={() => handleEditOrder(order.id)}
                                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-orange-600 transition-colors"
                                                            title="Edit (Convert to Held)"
                                                            disabled={actionLoading}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {/* Do not allow deleting or resuming cancelled orders easily unless intended, sticking to existing delete logic which works for any */}
                                                    <button
                                                        onClick={() => setDeleteConfirmOrder(order)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                                                        title="Delete Order"
                                                        disabled={actionLoading}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                    {order.status !== 'CANCELLED' && (
                                                        <button
                                                            onClick={() => handleResumeOrder(order.id)}
                                                            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${editedOrders.has(order.id)
                                                                ? 'text-gray-500 hover:text-green-600 cursor-pointer'
                                                                : 'text-gray-400 cursor-not-allowed opacity-50'
                                                                }`}
                                                            title={editedOrders.has(order.id) ? "Resume Order" : "Click Edit first to resume this order"}
                                                            disabled={!editedOrders.has(order.id) || actionLoading}
                                                        >
                                                            <Play className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination (Online Only) */}
                        {isOnline && totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-white">
                                <span className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || loading}
                                        className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || loading}
                                        className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Order Details Modal */}
                <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                    <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
                        {/* Header with Gradient */}
                        <DialogHeader className="p-6 bg-gradient-to-r from-orange-400 to-orange-600 text-white">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                                        <ClipboardList className="h-6 w-6" />
                                        Order Summary
                                    </DialogTitle>
                                    <DialogDescription className="text-orange-50 font-medium">
                                        #{selectedOrder?.kotNo} • {new Date(selectedOrder?.updatedAt).toLocaleString()}
                                    </DialogDescription>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold border border-white/30">
                                    Completed
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedOrder && (
                            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                {/* Fixed Info Section */}
                                <div className="p-4 space-y-4 shrink-0 border-b border-gray-100 bg-gray-50/50">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Customer Details */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-orange-600 font-semibold uppercase tracking-wider text-xs">
                                                <div className="bg-orange-100 p-1.5 rounded-lg">
                                                    <ClipboardList className="h-4 w-4" />
                                                </div>
                                                Customer Details
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-medium uppercase">Name</p>
                                                    <p className="font-semibold text-gray-900 text-lg">{selectedOrder.customerName || "Walk-in Customer"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 font-medium uppercase">Mobile Number</p>
                                                    <p className="font-medium text-gray-700">{selectedOrder.customerMobile || "Not Provided"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Details */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-blue-600 font-semibold uppercase tracking-wider text-xs">
                                                <div className="bg-blue-100 p-1.5 rounded-lg">
                                                    <ClipboardList className="h-4 w-4" />
                                                </div>
                                                Order Info
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-medium uppercase">Table</p>
                                                        <p className="font-semibold text-gray-900 text-lg">{selectedOrder.tableName || "Counter"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400 font-medium uppercase">Payment</p>
                                                        <p className="font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-sm border border-green-100">Paid</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>


                                {/* Scrollable Items Section (Start) */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {/* Items Table */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            Order Items
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                {Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0}
                                            </span>
                                        </h3>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Item Details</th>
                                                        <th className="px-6 py-3 text-center font-semibold text-gray-600">Qty</th>
                                                        <th className="px-6 py-3 text-right font-semibold text-gray-600">Unit Price</th>
                                                        <th className="px-6 py-3 text-right font-semibold text-gray-600">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-gray-900">{item.name}</p>
                                                                {item.addons && item.addons.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                                                        {item.addons.map((addon: any, i: number) => (
                                                                            <span key={i} className="inline-flex items-center text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200">
                                                                                + {addon.quantity} {addon.addon.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-medium text-gray-600">x{item.quantity}</td>
                                                            <td className="px-6 py-4 text-right text-gray-500">₹{item.unitPrice}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                                ₹{(item.unitPrice * item.quantity) + (item.addons?.reduce((sum: number, a: any) => sum + (a.addon.price * a.quantity), 0) || 0) * 1}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50/80 border-t border-gray-200">
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-600">Subtotal</td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                            {(() => {
                                                                const subtotal = selectedOrder.items?.reduce((sum: number, item: any) => {
                                                                    const itemTotal = (item.unitPrice * item.quantity) + (item.addons?.reduce((s: number, a: any) => s + (a.addon.price * a.quantity), 0) || 0)
                                                                    return sum + itemTotal
                                                                }, 0) || 0
                                                                return `₹${subtotal.toFixed(2)}`
                                                            })()}
                                                        </td>
                                                    </tr>
                                                    {selectedOrder.discountAmount > 0 && businessDetails?.enableDiscount && (
                                                        <tr>
                                                            <td colSpan={3} className="px-6 py-4 text-right font-semibold text-green-600">Discount</td>
                                                            <td className="px-6 py-4 text-right font-semibold text-green-600">
                                                                -₹{Number(selectedOrder.discountAmount).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {selectedOrder.taxAmount > 0 && businessDetails?.showTaxBreakdown && (
                                                        (businessDetails?.taxName || 'GST').toUpperCase().includes('GST') ? (
                                                            <>
                                                                <tr>
                                                                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-600">
                                                                        CGST ({(Number(businessDetails?.taxRate || 0) / 2)}%)
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                                        +₹{(Number(selectedOrder.taxAmount) / 2).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-600">
                                                                        SGST ({(Number(businessDetails?.taxRate || 0) / 2)}%)
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                                        +₹{(Number(selectedOrder.taxAmount) / 2).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-600">
                                                                    {businessDetails?.taxName || 'GST'} ({businessDetails?.taxRate}%)
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                                    +₹{Number(selectedOrder.taxAmount).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                    <tr className="bg-orange-50/50">
                                                        <td colSpan={3} className="px-6 py-4 text-right font-bold text-orange-800 text-base">Grand Total</td>
                                                        <td className="px-6 py-4 text-right font-bold text-orange-600 text-xl">₹{selectedOrder.totalAmount.toFixed(2)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>


                                {/* Fixed Info Close Added */}



                                {/* Footer Actions */}
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                                    <button
                                        onClick={() => handlePrint(selectedOrder)}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
                                    >
                                        <Printer className="h-4 w-4" /> Print Bill/Receipt
                                    </button>
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 shadow-lg shadow-gray-200 hover:shadow-xl transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </DialogContent >
                </Dialog >

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteConfirmOrder} onOpenChange={(open) => !open && setDeleteConfirmOrder(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-red-600" />
                                Delete Order?
                            </DialogTitle>
                            <DialogDescription className="text-gray-600 pt-2">
                                Are you sure you want to delete order <span className="font-bold">#{deleteConfirmOrder?.kotNo}</span>?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setDeleteConfirmOrder(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteOrder(deleteConfirmOrder.id)}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Deleting...' : 'Delete Order'}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog >
            </div >

            {/* Hidden Print Template */}
            {
                printOrder && (
                    <div style={{ display: 'none' }}>
                        <div ref={printRef}>
                            <ReceiptTemplate
                                order={printOrder}
                                businessDetails={businessDetails}
                                storeDetails={storeDetails}
                            />
                        </div>
                    </div>
                )
            }
        </>
    )
}
