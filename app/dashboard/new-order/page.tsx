"use client"

import { useState } from "react"
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, User, Phone, Save, Printer, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ProductCustomizationModal, Product, Addon } from "@/components/pos/product-modal"

// --- Mock Data ---
const CATEGORIES = [
    { id: 'coffee', name: 'Coffee' },
    { id: 'snacks', name: 'Snacks' },
    { id: 'beverages', name: 'Beverages' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'combos', name: 'Combos' },
]

// Updated to match Product type
const PRODUCTS: Product[] = [
    { id: 1, categoryId: 'coffee', name: 'Espresso', price: 120 },
    { id: 2, categoryId: 'coffee', name: 'Cappuccino', price: 150 },
    { id: 3, categoryId: 'coffee', name: 'Latte', price: 160 },
    { id: 4, categoryId: 'coffee', name: 'Americano', price: 130 },
    { id: 5, categoryId: 'coffee', name: 'Mocha', price: 180 },
    { id: 6, categoryId: 'snacks', name: 'Croissant', price: 90 },
    { id: 7, categoryId: 'snacks', name: 'Muffin', price: 80 },
    { id: 8, categoryId: 'snacks', name: 'Sandwich', price: 110 },
]

type CartItem = {
    cartId?: string // Unique ID for cart item to handle same product with different addons
    id: number
    name: string
    unitPrice: number
    quantity: number
    addons?: { addon: Addon, quantity: number }[]
}

export default function NewOrderPage() {
    const [selectedCategory, setSelectedCategory] = useState('coffee')
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [discount, setDiscount] = useState<string>('0')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    // Filter products
    const filteredProducts = PRODUCTS.filter(product =>
        product.categoryId === selectedCategory &&
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
        const itemTotal = item.unitPrice * item.quantity
        const addonsTotal = (item.addons?.reduce((asum, a) => asum + (a.addon.price * a.quantity), 0) || 0)
        // Note: Addons price usually multiplies by item quantity too in some POS, but here keeping independent per "Item Set" or per "Unit"
        // Let's assume addons are per Unit of product.
        // Actually the modal returns "quantity" of main product.
        // If I buy 2 Cappuccinos with Extra Shot, it means 2 * (150 + 50).
        // Let's stick to simple logic: (Base + Addons) * Quantity
        const unitAddonsCost = item.addons?.reduce((as, a) => as + (a.addon.price * a.quantity), 0) || 0
        return sum + ((item.unitPrice * item.quantity) + (unitAddonsCost)) // Wait, if I have 2 cappuccinos, usually addons apply to each?
        // For simplicity in this structure: The modal adds a "Line Item".
        // If Model says Qty: 2, Addon: 1 Shot. It usually means 2 Cappuccinos, and TOTAL 1 Shot? Or 1 Shot per Cappucino?
        // In this modal implementation: "Addon Quantity" is independent.
        // Let's assume Addons are a flat addition to the line item.
        // Line Total = (Product Price * Prod Qty) + (Addon Price * Addon Qty)
        // Re-reading modal logic: basePrice = product * qty. addonsPrice = addon * qty.
        // So yes, it's a flat sum.
        return sum + itemTotal + addonsTotal
    }, 0)

    const tax = subtotal * 0.05 // 5% Tax
    const discountAmount = Number(discount) || 0
    const total = subtotal + tax - discountAmount

    return (
        <div className="h-full overflow-hidden flex flex-col md:flex-row gap-6">

            {/* LEFT: Categories & Products (Flexible width) */}
            <div className="flex-1 flex gap-4 min-w-0 overflow-hidden">

                {/* 1. Categories Sidebar */}
                <div className="w-56 hidden lg:flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0 transition-all">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-800">Categories</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {CATEGORIES.map(cat => (
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
                        <h2 className="font-bold text-gray-800 capitalize">{selectedCategory}</h2>
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
                                            <p className="text-xl font-bold text-gray-900 mt-1">₹{product.price}</p>
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
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-800">Current Order</h2>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <Input placeholder="Guest Name" className="h-9 bg-white border-gray-200 focus:border-orange-500 rounded-lg text-sm" />
                    </div>
                    <div>
                        <Input placeholder="Mobile No" className="h-9 bg-white border-gray-200 focus:border-orange-500 rounded-lg text-sm" />
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
                                        <p className="text-xs text-gray-500">₹{item.unitPrice} x {item.quantity}</p>
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
                                        ₹{(item.unitPrice * item.quantity) + (item.addons?.reduce((sum, a) => sum + (a.addon.price * a.quantity), 0) || 0) * 1}
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
                        <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tax (5%)</span>
                        <span className="font-medium">₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Discount</span>
                        <div className="w-20">
                            <Input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                className="h-7 text-right bg-white border-gray-200 text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800">Total</span>
                        <span className="text-2xl font-bold text-orange-600">₹{total.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-sm active:scale-95 transition-all">
                            <Save className="h-4 w-4" /> Save
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm active:scale-95 transition-all">
                            <Clock className="h-4 w-4" /> KOT
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm active:scale-95 transition-all">
                            <Printer className="h-4 w-4" /> Print
                        </button>
                        <button
                            onClick={() => setCart([])}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm active:scale-95 transition-all"
                        >
                            <Trash2 className="h-4 w-4" /> Clear
                        </button>
                    </div>
                </div>
            </div>

            <ProductCustomizationModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
                onAddToBill={handleAddToBill}
            />
        </div>
    )
}
