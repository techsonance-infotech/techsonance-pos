"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Plus, Minus, Trash2, ShoppingCart, Save, Printer, Clock, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ProductCustomizationModal, Product, Addon } from "@/components/pos/product-modal"
import { useSearchParams, useRouter } from "next/navigation"
import { saveOrder, getOrder } from "@/app/actions/orders"
import { getPOSInitialData } from "@/app/actions/pos"
import { ReceiptTemplate } from "@/components/pos/receipt-template"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import NewOrderLoading from "./loading"
import { db } from "@/lib/db"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { getPOSService } from "@/lib/pos-service"

type CartItem = {
    cartId?: string
    id: string | number
    name: string
    unitPrice: number
    quantity: number
    addons?: { addon: Addon, quantity: number }[]
}

export default function NewOrderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { currency } = useCurrency()
    const isOnline = useNetworkStatus()

    // Data State
    const [categories, setCategories] = useState<any[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    // UI State
    // UI State
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [resumeId, setResumeId] = useState<string | null>(null)
    const [guestName, setGuestName] = useState('')
    const [guestMobile, setGuestMobile] = useState('')
    const [printOrder, setPrintOrder] = useState<any | null>(null)
    const [businessDetails, setBusinessDetails] = useState<any>(null)
    const loadedOrderRef = useRef<string | null>(null) // Track loaded order to prevent duplicate toasts
    const [saving, setSaving] = useState(false)
    const [holding, setHolding] = useState(false)
    const [printing, setPrinting] = useState(false)
    const [paymentMode, setPaymentMode] = useState<string>('CASH')
    const [storeDetails, setStoreDetails] = useState<any>(null)

    // URL Params
    const tableId = searchParams.get('tableId')
    const tableName = searchParams.get('tableName')

    // Initial Load
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true)
            try {
                const posService = getPOSService()

                // 1. Load Local First (Cache-First)
                const localProducts = await posService.getProducts()
                const localCategories = await posService.getCategories()
                const localSettings = await posService.getSettings()

                if (localProducts.length > 0 && localCategories.length > 0) {
                    setProducts(localProducts as any)
                    setCategories(localCategories as any)

                    const business = localSettings.find(s => s.key === 'businessDetails')?.value
                    const store = localSettings.find(s => s.key === 'storeDetails')?.value
                    setBusinessDetails(business)
                    setStoreDetails(store)

                    if (localCategories.length > 0 && selectedCategory === 'all') {
                        setSelectedCategory(localCategories[0].id)
                    }
                }

                // 2. If Online & Local Empty, fetch from Server
                if (localProducts.length === 0 && isOnline) {
                    const data = await getPOSInitialData()
                    if (data) {
                        setCategories(data.categories)
                        setProducts(data.products)
                        setBusinessDetails(data.businessDetails)
                        setStoreDetails(data.storeDetails)
                        if (data.categories.length > 0) setSelectedCategory(data.categories[0].id)
                    }
                }
            } catch (error) {
                console.error("Failed to load POS data", error)
                // Only show toast if it's a real error, not just empty
                const msg = error instanceof Error ? error.message : String(error)
                if (msg !== 'No products found') {
                    toast.error(`Failed to load products: ${msg}`)
                }
            } finally {
                setLoading(false)
            }
        }
        loadInitialData()
    }, [isOnline])

    // --- Unified Order Processing ---
    async function processOrder(status: 'COMPLETED' | 'HELD', print: boolean = false) {
        if (cart.length === 0) return

        if (guestMobile && guestMobile.length !== 10) {
            toast.error("Mobile number must be exactly 10 digits")
            return
        }

        const actionSet = status === 'HELD' ? setHolding : (print ? setPrinting : setSaving)
        actionSet(true)

        try {
            const orderData = {
                id: resumeId || crypto.randomUUID(), // Generate UUID if new
                status,
                totalAmount: total,
                items: cart,
                customerName: guestName,
                customerMobile: guestMobile,
                tableId: tableId || null,
                tableName: tableName || null,
                paymentMode,
                kotNo: `KOT${Date.now().toString().slice(-6)}`, // Temporary KOT
                createdAt: new Date().toISOString() // For local storage
            }

            if (!isOnline) {
                // --- OFFLINE SAVE ---
                const posService = getPOSService()
                const result = await posService.saveOrder({
                    ...orderData,
                    items: cart,
                    createdAt: Date.now(),
                    status: 'PENDING_SYNC'
                })

                if (result.success) {
                    toast.success(status === 'HELD' ? "Order Held Offline" : "Order Saved Offline (Pending Sync)", {
                        icon: "💾"
                    })

                    if (print) {
                        setPrintOrder({ ...orderData, subtotal, taxAmount: tax, createdAt: new Date() })
                        setTimeout(() => window.print(), 100)
                    }

                    finishOrder(print)
                } else {
                    toast.error("Failed to save offline: " + result.error)
                }

            } else {
                // --- ONLINE SAVE ---
                const result = await saveOrder({
                    ...orderData,
                    id: resumeId, // allow null
                    status // pass status explicitly
                })

                if (result?.success) {
                    toast.success(status === 'HELD' ? "Order Held Successfully" : "Order Saved Successfully")

                    if (print) {
                        setPrintOrder({ ...orderData, subtotal, taxAmount: tax, createdAt: new Date() })
                        setTimeout(() => window.print(), 100)
                    }
                    finishOrder(print)
                } else {
                    toast.error(result?.error || "Failed to save order")
                }
            }
        } catch (err) {
            console.error(err)
            toast.error("An error occurred while saving")
        } finally {
            actionSet(false)
        }
    }

    function finishOrder(wasPrint: boolean) {
        // If printing, wait a bit before clearing to allow print dialog
        const delay = wasPrint ? 500 : 0
        setTimeout(() => {
            setCart([])
            setGuestName('')
            setGuestMobile('')
            setResumeId(null)
            setPaymentMode('CASH')
            if (wasPrint) setPrintOrder(null)

            // If held, dispatch event
            // window.dispatchEvent(new Event('holdOrderUpdated')) // Optional if we want to update header count offline?

            router.push('/dashboard/new-order')
        }, delay)
    }

    // Filter products
    const filteredProducts = products.filter(product => {
        // categoryId might be string vs selectedCategory string
        // If selectedCategory is a ID, exact match.
        // Also handle 'all' if needed, though typically POS selects one category.
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
        // Only show available products
        return matchesCategory && matchesSearch && (product.isAvailable !== false)
    })

    // --- Cart Logic ---
    const handleProductClick = (product: Product) => {
        setSelectedProduct(product)
    }

    const handleAddToBill = (item: { product: Product, quantity: number, addons: { addon: Addon, quantity: number }[] }) => {
        const newItem: CartItem = {
            cartId: Math.random().toString(36).substr(2, 9),
            id: item.product.id,
            name: item.product.name,
            unitPrice: item.product.price,
            quantity: item.quantity,
            addons: item.addons
        }
        setCart(prev => [...prev, newItem])
    }

    const updateQuantity = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    // --- Calculations ---
    const subtotal = cart.reduce((sum, item) => {
        const unitAddonsCost = item.addons?.reduce((as, a) => as + (a.addon.price * a.quantity), 0) || 0
        return sum + ((item.unitPrice * item.quantity) + (unitAddonsCost))
    }, 0)

    const taxRate = parseFloat(businessDetails?.taxRate || '5')
    const taxName = businessDetails?.taxName || 'Tax'
    // Only calculate tax if tax breakdown is enabled (treating it as enabled/disabled)
    const isTaxEnabled = businessDetails?.showTaxBreakdown !== false
    const tax = isTaxEnabled ? (subtotal * (taxRate / 100)) : 0

    // Calculate discount based on settings
    const discountAmount = (businessDetails?.enableDiscount && businessDetails?.defaultDiscount)
        ? parseFloat(businessDetails.defaultDiscount)
        : 0

    // Ensure discount doesn't exceed total (subtotal + tax)
    const appliedDiscount = Math.min(discountAmount, subtotal + tax)
    const total = subtotal + tax - appliedDiscount


    if (loading) return <NewOrderLoading />

    return (
        <>
            <div className="h-[calc(100vh-theme(spacing.20))] flex gap-6 p-6 overflow-hidden no-print">
                {/* LEFT: Categories & Products (Flexible width) */}
                <div className="flex-1 flex gap-4 min-w-0 overflow-hidden">
                    {/* 1. Categories Sidebar */}
                    <div className="w-56 hidden lg:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0 transition-all">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800">Categories</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all truncate",
                                        selectedCategory === cat.id
                                            ? "bg-orange-50 text-orange-700"
                                            : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* 2. Products Grid */}
                    <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <h2 className="font-bold text-gray-800 capitalize">
                                {selectedCategory === 'all'
                                    ? 'All Products'
                                    : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}
                            </h2>
                            <div className="relative w-full sm:w-64">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 w-full bg-gray-50/50 border-none pl-10 pr-4 text-sm outline-none ring-1 ring-gray-200 transition-all focus:bg-white focus:ring-2 focus:ring-orange-500/20 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                                {filteredProducts.map(product => {
                                    const inCart = cart.find(i => i.id === product.id)?.quantity || 0
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className={cn(
                                                "bg-white border rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:shadow-md active:scale-95 group relative overflow-hidden",
                                                "border-gray-100 hover:border-orange-100" // selectedProduct?.id === product.id ? "border-orange-500 bg-orange-50" : ...
                                            )}
                                        >
                                            {/* Decorative Background Circle */}
                                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-gray-50 rounded-full group-hover:bg-orange-50 transition-colors" />

                                            <div className="relative z-10">
                                                <h3 className="font-bold text-gray-800 group-hover:text-orange-700 transition-colors line-clamp-1" title={product.name}>{product.name}</h3>
                                                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(product.price, currency.symbol)}</p>
                                            </div>

                                            <div className="mt-auto self-end">
                                                <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                                                    {inCart > 0 ? <span className="font-bold text-lg">{inCart}</span> : <Plus className="h-5 w-5" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Cart Panel (Fixed Wider Width) */}
                <div className="w-full md:w-[380px] flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 shrink-0">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-gray-800">Current Order</h2>
                        {tableName && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                                Table: {tableName}
                            </span>
                        )}
                        {!isOnline && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Offline
                            </span>
                        )}
                    </div>

                    <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50/50">
                        <div>
                            <Input
                                placeholder="Guest Name"
                                className="h-9 bg-white border-gray-200 focus:border-orange-500 rounded-lg text-sm"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value.slice(0, 10))}
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Mobile No"
                                className="h-9 bg-white border-gray-200 focus:border-orange-500 rounded-lg text-sm"
                                value={guestMobile}
                                onChange={(e) => setGuestMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                            />
                        </div>
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-60">
                                <ShoppingCart className="h-12 w-12 mb-3" />
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {cart.map(item => (
                                    <div key={item.cartId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice, currency.symbol)} x {item.quantity}</p>
                                            {item.addons && item.addons.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.addons.map((addon, idx) => (
                                                        <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-md border border-orange-100">
                                                            {addon.quantity}x {addon.addon.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                            <button
                                                onClick={() => updateQuantity(item.cartId!, -1)}
                                                className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.cartId!, 1)}
                                                className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="w-16 text-right font-bold text-sm">
                                            {formatCurrency((item.unitPrice * item.quantity) + (item.addons?.reduce((sum, a) => sum + (a.addon.price * a.quantity), 0) || 0) * 1, currency.symbol)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Totals */}
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{formatCurrency(subtotal, currency.symbol)}</span>
                        </div>
                        {businessDetails?.showTaxBreakdown && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{taxName} ({taxRate}%)</span>
                                <span className="font-medium">{formatCurrency(tax, currency.symbol)}</span>
                            </div>
                        )}
                        {businessDetails?.enableDiscount && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Discount</span>
                                <span className="font-medium text-orange-600">- {formatCurrency(appliedDiscount, currency.symbol)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Payment Mode</span>
                            <div className="w-32">
                                <Select value={paymentMode} onValueChange={setPaymentMode}>
                                    <SelectTrigger className="h-7 bg-white border-gray-200 focus:ring-orange-500 rounded-lg text-xs">
                                        <SelectValue placeholder="Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CARD">Card</SelectItem>
                                        <SelectItem value="UPI">UPI / Online</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-lg font-bold text-gray-800">Total</span>
                                <span className="text-2xl font-bold text-gray-800">{formatCurrency(total, currency.symbol)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => processOrder('COMPLETED')}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={saving || holding || printing}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => processOrder('HELD')}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={saving || holding || printing}
                                >
                                    {holding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                                    {holding ? 'Holding...' : 'KOT (Hold)'}
                                </button>
                                <button
                                    onClick={() => processOrder('COMPLETED', true)}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={saving || holding || printing}
                                >
                                    {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                    {printing ? 'Printing...' : 'Save & Print'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to clear the current order?")) {
                                            setCart([])
                                            setGuestName('')
                                            setGuestMobile('')
                                            setResumeId(null)
                                            setPaymentMode('CASH')
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm active:scale-95 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" /> Clear Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ProductCustomizationModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
                addons={selectedProduct?.addons || []}
                onAddToBill={handleAddToBill}
            />

            {/* Hidden Print Template */}
            {
                printOrder && (
                    <div className="hidden print:block print-only fixed inset-0 z-[9999] bg-white">
                        <ReceiptTemplate
                            order={printOrder}
                            businessDetails={businessDetails}
                            storeDetails={storeDetails}
                        />
                    </div>
                )
            }
        </>
    )
}
