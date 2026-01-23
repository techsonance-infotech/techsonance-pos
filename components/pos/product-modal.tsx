"use client"

import { useState, useEffect } from "react"
import { X, Plus, Minus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Types
export type Addon = {
    id: string
    name: string
    price: number
    isAvailable?: boolean
}

export type Product = {
    id: string | number
    name: string
    price: number
    categoryId: string
    description?: string | null
    image?: string
    isAvailable?: boolean
    addons?: Addon[]
}

// Mock Addons Removed - Passing via props

interface ProductCustomizationModalProps {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    addons: Addon[]
    onAddToBill: (item: { product: Product, quantity: number, addons: { addon: Addon, quantity: number }[] }) => void
    initialQuantity?: number
    initialAddons?: { addon: Addon, quantity: number }[]
}

export function ProductCustomizationModal({ isOpen, onClose, product, addons, onAddToBill, initialQuantity, initialAddons }: ProductCustomizationModalProps) {
    const [quantity, setQuantity] = useState(1)
    const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: number }>({})
    const [addonSearch, setAddonSearch] = useState("")

    // Reset state when product opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(initialQuantity || 1)

            // Convert array to map
            const addonsMap: { [key: string]: number } = {}
            if (initialAddons && initialAddons.length > 0) {
                initialAddons.forEach(a => {
                    addonsMap[a.addon.id] = a.quantity
                })
            }
            setSelectedAddons(addonsMap)

            setAddonSearch("")
        }
    }, [isOpen, product])

    if (!isOpen || !product) return null

    // Handlers
    const updateAddonQuantity = (addonId: string, delta: number) => {
        setSelectedAddons(prev => {
            const current = prev[addonId] || 0
            // Limit max 4 per addon
            const newQty = Math.max(0, Math.min(4, current + delta))
            if (newQty === 0) {
                const { [addonId]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [addonId]: newQty }
        })
    }

    // Calculations
    const basePrice = product.price * quantity
    const addonsPrice = addons.reduce((sum, addon) => {
        const qty = selectedAddons[addon.id] || 0
        return sum + (addon.price * qty)
    }, 0)
    const totalPrice = basePrice + addonsPrice

    const handleAdd = () => {
        const addonsList = Object.entries(selectedAddons).map(([id, qty]) => ({
            addon: addons.find(a => a.id === id)!,
            quantity: qty
        }))
        onAddToBill({ product, quantity, addons: addonsList })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQuantity(Math.max(0, quantity - 1))}
                            className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-lg text-gray-800">{quantity}</span>
                        <button
                            onClick={() => setQuantity(Math.min(100, quantity + 1))}
                            className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Price Breakdown */}
                    <div className="flex justify-between items-center text-gray-600 pb-4 border-b border-gray-50">
                        <span className="text-sm font-medium">Base Price</span>
                        <span className="text-lg font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
                    </div>

                    {/* Add-ons List */}
                    {addons && addons.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Add ons</h3>
                                <div className="relative w-40">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                    <Input
                                        placeholder="Search..."
                                        value={addonSearch}
                                        onChange={(e) => setAddonSearch(e.target.value)}
                                        className="h-8 pl-7 text-xs bg-gray-50 border-gray-100"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                {addons.filter(addon =>
                                    addon.name.toLowerCase().includes(addonSearch.toLowerCase())
                                ).map(addon => {
                                    if (addon.isAvailable === false) return null // Skip unavailable
                                    const qty = selectedAddons[addon.id] || 0
                                    return (
                                        <div key={addon.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{addon.name}</p>
                                                <p className="text-xs text-gray-500">{addon.price === 0 ? 'Free' : `+₹${addon.price}`}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateAddonQuantity(addon.id, -1)}
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                        qty > 0 ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gray-50 text-gray-300 pointer-events-none"
                                                    )}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className={cn("w-6 text-center font-bold", qty > 0 ? "text-gray-800" : "text-gray-300")}>
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={() => updateAddonQuantity(addon.id, 1)}
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                        qty >= 4 ? "bg-gray-50 text-gray-300 pointer-events-none" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    )}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Total */}
                    <div className="pt-4 flex justify-between items-center">
                        <span className="text-lg font-bold text-green-600">Total :</span>
                        <span className="text-2xl font-bold text-green-600">₹{totalPrice}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        className={cn(
                            "py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]",
                            quantity === 0
                                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                                : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                        )}
                    >
                        {quantity === 0 ? "Remove Item" : (initialQuantity ? "Update Bill" : "Add to Bill")}
                    </button>
                </div>

            </div>
        </div>
    )
}
