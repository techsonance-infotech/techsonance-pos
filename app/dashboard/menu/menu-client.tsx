"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, Power, ArrowUp, ArrowDown, GripVertical, List } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
    getCategories,
    getProducts,
    saveCategory,
    deleteCategory,
    toggleCategoryStatus,
    updateCategoryOrder,
    saveProduct,
    deleteProduct,
    toggleProductStatus,
    updateProductOrder,
    saveAddon,
    deleteAddon
} from "@/app/actions/menu"
import { getMenuPageData } from "@/app/actions/pos"
import { cn } from "@/lib/utils"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import MenuLoading from "./loading"
import { useNetworkStatus } from "@/hooks/use-network-status"

function SortableCategoryItem({ category, isSelected, onSelect, onEdit }: { category: any, isSelected: boolean, onSelect: () => void, onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative' as 'relative',
        opacity: isDragging ? 0.8 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className={cn("group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer bg-white", isSelected ? "bg-orange-50 border-orange-200" : "border-gray-100 hover:border-gray-200")} onClick={onSelect}>
            <div {...attributes} {...listeners} className="touch-none flex items-center justify-center p-1 text-gray-400 hover:text-orange-600 cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn("font-semibold truncate", !category.isActive && "text-gray-400 line-through")}>{category.name}</span>
                    {!category.isActive && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <span className="text-xs text-gray-400">{category.products?.length || 0} items</span>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit() }}>
                <Edit className="h-3.5 w-3.5 text-blue-500" />
            </Button>
        </div>
    )
}

function SortableProductItem({ product, onEdit, onToggle, onDelete, currencySymbol }: { product: any, onEdit: (p: any) => void, onToggle: (p: any) => void, onDelete: (id: string) => void, currencySymbol: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative' as 'relative',
        opacity: isDragging ? 0.8 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-100 hover:shadow-md transition-all bg-white group">
            <div {...attributes} {...listeners} className="touch-none flex flex-col justify-center text-gray-300 hover:text-orange-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h3 className={cn("font-semibold text-gray-900", !product.isAvailable && "text-gray-400 line-through")}>{product.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                    </div>
                    <span className="font-bold text-orange-600">{currencySymbol}{product.price}</span>
                </div>
                <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-400">Available</Label>
                        <Switch checked={product.isAvailable} onCheckedChange={() => onToggle(product)} className="scale-75 origin-left" />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => onEdit(product)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(product.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function MenuManagementClient() {
    const { currency } = useCurrency()
    const isOnline = useNetworkStatus()

    // Data State
    const [categories, setCategories] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([]) // Products of selected category
    const [loading, setLoading] = useState(true)
    const [productsLoading, setProductsLoading] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Modals
    const [isCatModalOpen, setIsCatModalOpen] = useState(false)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)

    // Editing State (For Forms)
    const [editingCategory, setEditingCategory] = useState<any | null>(null)
    const [editingProduct, setEditingProduct] = useState<any | null>(null)

    // Forms
    const [catForm, setCatForm] = useState({ name: "", sortOrder: "", isActive: true })
    const [prodForm, setProdForm] = useState({ name: "", price: "", description: "", isAvailable: true, sortOrder: "" })

    // Addon Management State (Inside Product Modal)
    const [addons, setAddons] = useState<any[]>([])
    const [newAddon, setNewAddon] = useState({ name: "", price: "", isAvailable: true })

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        // Only load products when category changes AFTER initial load
        if (selectedCategory && categories.length > 0 && selectedCategory.id !== categories[0]?.id) {
            loadProducts(selectedCategory.id)
        }
    }, [selectedCategory])

    async function loadCategories(silent = false) {
        if (!silent) setLoading(true)
        const cats = await getCategories(true)
        setCategories(cats)
        setLoading(false)
    }

    async function loadInitialData() {
        setLoading(true)
        try {
            const data = await getMenuPageData()
            if (data) {
                setCategories(data.categories)
                setProducts(data.products)
                if (data.categories.length > 0) {
                    setSelectedCategory(data.categories[0])
                }
            }
        } catch (error) {
            // Offline fallback - load from local IndexedDB
            console.warn("Menu page: Server fetch failed, using local cache", error)
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const posService = getPOSService()
                const localCategories = await posService.getCategories()
                const allLocalProducts = await posService.getProducts()

                setCategories(localCategories as any[])

                if (localCategories.length > 0) {
                    const firstCat = localCategories[0]
                    setSelectedCategory(firstCat)
                    const filtered = allLocalProducts.filter(p => p.categoryId === firstCat.id).sort((a, b) => a.sortOrder - b.sortOrder)
                    setProducts(filtered as any[])
                } else {
                    setProducts([])
                }
            } catch (innerError) {
                console.error("Failed to load local menu data", innerError)
            }
        }
        setLoading(false)
    }

    async function loadProducts(catId: string) {
        setProductsLoading(true)
        try {
            const prods = await getProducts(catId, true)
            setProducts(prods)
        } catch (error) {
            console.warn("Products fetch failed, trying local", error)
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const allProds = await getPOSService().getProducts()
                setProducts(allProds.filter(p => p.categoryId === catId).sort((a, b) => a.sortOrder - b.sortOrder))
            } catch (e) {
                // ignore
            }
        } finally {
            setProductsLoading(false)
        }
    }

    // --- Category Actions ---

    const handleSaveCategory = async () => {
        if (!catForm.name) return
        setIsSaving(true)
        const res = await saveCategory({ id: editingCategory?.id, ...catForm })

        if (res.success) {
            toast.success("Category saved successfully")
            setIsCatModalOpen(false)
            loadCategories(true)
            // Reset saving state after a delay or heavily rely on open to reset
            setTimeout(() => setIsSaving(false), 500)
        } else {
            setIsSaving(false)
            toast.error(res.error || "Failed to save category")
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (confirm("Delete this category? All products inside will be deleted.")) {
            await deleteCategory(id)
            loadCategories(true)
            if (selectedCategory?.id === id) setSelectedCategory(null)
        }
    }

    const handleCategoryReorder = async (index: number, direction: 'up' | 'down') => {
        const newCats = [...categories]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newCats.length) return

        // Swap
        const temp = newCats[index]
        newCats[index] = newCats[targetIndex]
        newCats[targetIndex] = temp

        // Update UI immediately
        setCategories(newCats)

        // Update backend with new sortOrders
        // We assign sortOrder based on index + 1
        const updates = newCats.map((c: any, i: number) => ({ id: c.id, sortOrder: i + 1 }))
        await updateCategoryOrder(updates)
    }

    // --- Product Actions ---

    const handleOpenProductModal = (product?: any) => {
        setIsSaving(false) // Reset state
        if (product) {
            setEditingProduct(product)
            setProdForm({
                name: product.name,
                price: product.price.toString(),
                description: product.description || "",
                isAvailable: product.isAvailable,
                sortOrder: product.sortOrder?.toString() || ""
            })
            setAddons(product.addons || [])
        } else {
            setEditingProduct(null)
            setProdForm({ name: "", price: "", description: "", isAvailable: true, sortOrder: "" })
            setAddons([])
        }
        setIsProductModalOpen(true)
    }

    const handleSaveProduct = async () => {
        if (!prodForm.name || !prodForm.price) return

        setIsSaving(true)
        // 1. Save Product
        const res = await saveProduct({
            id: editingProduct?.id,
            categoryId: selectedCategory.id,
            ...prodForm
        })
        // Remove immediate setIsSaving(false) to prevent flash
        // setIsSaving(false) 

        if (!res.success) {
            setIsSaving(false)
            return toast.error(res.error || "Failed to save product")
        }

        // 2. Save Pending Add-ons (for new products)
        const productId = res.product?.id
        if (productId) {
            const pendingAddons = addons.filter((a: any) => a.id.toString().startsWith('temp-'))
            for (const addon of pendingAddons) {
                await saveAddon({
                    productId: productId,
                    name: addon.name,
                    price: addon.price,
                    isAvailable: addon.isAvailable,
                    sortOrder: 0 // Backend handles
                })
            }
        }

        toast.success("Product saved successfully")
        setIsProductModalOpen(false)
        loadProducts(selectedCategory.id)
        setTimeout(() => setIsSaving(false), 500)
    }

    const handleAddAddon = async () => {
        if (!newAddon.name || newAddon.price === "") return toast.error("Please enter both name and price")

        // If Editing an existing product, save immediately
        if (editingProduct?.id) {
            const res = await saveAddon({
                productId: editingProduct.id,
                ...newAddon,
                sortOrder: addons.length + 1
            })
            if (!res.success) return toast.error(res.error || "Failed to add addon")

            toast.success("Add-on added")
            // Refresh
            const prods = await getProducts(selectedCategory.id, true)
            const updatedProd = prods.find((p: any) => p.id === editingProduct.id)
            if (updatedProd) setAddons(updatedProd.addons)
        } else {
            // Local State Only
            setAddons([...addons, {
                id: `temp-${Date.now()}`,
                ...newAddon,
                price: parseFloat(newAddon.price as string)
            }])
            toast.success("Add-on queued (Save Product to confirm)")
        }

        setNewAddon({ name: "", price: "", isAvailable: true })
    }

    const handleDeleteAddon = async (id: string) => {
        if (id.toString().startsWith('temp-')) {
            setAddons(addons.filter((a: any) => a.id !== id))
        } else {
            await deleteAddon(id)
            // Refresh
            const prods = await getProducts(selectedCategory.id, true)
            const updatedProd = prods.find((p: any) => p.id === editingProduct.id)
            if (updatedProd) setAddons(updatedProd.addons)
        }
    }

    const handleToggleAddon = async (addon: any) => {
        const newStatus = !addon.isAvailable

        // Optimistic Update
        const updatedAddons = addons.map((a: any) => a.id === addon.id ? { ...a, isAvailable: newStatus } : a)
        setAddons(updatedAddons)

        // If it's a temp addon, we are done
        if (addon.id.toString().startsWith('temp-')) return

        // Save to backend
        const res = await saveAddon({
            id: addon.id,
            productId: editingProduct.id,
            name: addon.name,
            price: addon.price,
            isAvailable: newStatus,
            sortOrder: addon.sortOrder || 0
        })

        if (!res.success) {
            toast.error("Failed to update status")
            // Revert by fetching fresh
            const prods = await getProducts(selectedCategory.id, true)
            const updatedProd = prods.find((p: any) => p.id === editingProduct.id)
            if (updatedProd) setAddons(updatedProd.addons)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        // 1. Try Category Reorder
        const oldCatIndex = categories.findIndex(c => c.id === active.id)
        if (oldCatIndex !== -1) {
            const newCatIndex = categories.findIndex(c => c.id === over.id)
            if (newCatIndex !== -1) {
                const newCats = arrayMove(categories, oldCatIndex, newCatIndex)
                setCategories(newCats) // Optimistic
                const updates = newCats.map((c: any, i: number) => ({ id: c.id, sortOrder: i + 1 }))
                await updateCategoryOrder(updates)
            }
            return
        }

        // 2. Try Product Reorder
        const oldProdIndex = products.findIndex(p => p.id === active.id)
        if (oldProdIndex !== -1) {
            const newProdIndex = products.findIndex(p => p.id === over.id)
            if (newProdIndex !== -1) {
                const newProds = arrayMove(products, oldProdIndex, newProdIndex)
                setProducts(newProds)
                const updates = newProds.map((p: any, i: number) => ({ id: p.id, sortOrder: i + 1 }))
                await updateProductOrder(updates)
            }
        }
    }

    if (loading) return <MenuLoading />

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-theme(spacing.20))] gap-6 overflow-hidden">

                {/* LEFT: Categories Sidebar */}
                <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-gray-800">Categories</h2>
                        <Button size="sm" onClick={() => {
                            if (!isOnline) { toast.error("Offline mode: Editing disabled"); return }
                            setIsSaving(false)
                            setEditingCategory(null)
                            setCatForm({ name: "", sortOrder: "", isActive: true })
                            setIsCatModalOpen(true)
                        }} disabled={!isOnline} className="h-8 w-8 p-0 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        <SortableContext items={categories} strategy={verticalListSortingStrategy}>
                            {categories.map((cat: any) => (
                                <SortableCategoryItem
                                    key={cat.id}
                                    category={cat}
                                    isSelected={selectedCategory?.id === cat.id}
                                    onSelect={() => setSelectedCategory(cat)}
                                    onEdit={() => {
                                        setIsSaving(false)
                                        setEditingCategory(cat)
                                        setCatForm({ name: cat.name, sortOrder: cat.sortOrder.toString(), isActive: cat.isActive })
                                        setIsCatModalOpen(true)
                                    }}
                                />
                            ))}
                        </SortableContext>
                    </div>
                </div>

                {/* RIGHT: Products Grid */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
                    {selectedCategory ? (
                        <>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedCategory.name}</h2>
                                    <p className="text-gray-500 text-sm">Manage products and add-ons</p>
                                </div>
                                <Button onClick={() => handleOpenProductModal()} disabled={!isOnline} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                                    <Plus className="h-4 w-4 mr-2" /> Add Product
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {productsLoading ? (
                                    <div className="space-y-3">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
                                                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="h-5 bg-gray-200 rounded animate-pulse w-48" />
                                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-64" />
                                                        </div>
                                                        <div className="h-5 bg-orange-200 rounded animate-pulse w-16" />
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-6 bg-gray-100 rounded animate-pulse w-24" />
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                                                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : products.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">No products in this category.</div>
                                ) : (
                                    <div className="space-y-3">
                                        <SortableContext items={products} strategy={verticalListSortingStrategy}>
                                            {products.map((product: any) => (
                                                <SortableProductItem
                                                    key={product.id}
                                                    product={product}
                                                    currencySymbol={currency.symbol}
                                                    onEdit={p => handleOpenProductModal(p)}
                                                    onToggle={async (p) => {
                                                        await toggleProductStatus(p.id, !p.isAvailable)
                                                        loadProducts(selectedCategory.id)
                                                    }}
                                                    onDelete={id => {
                                                        if (confirm("Delete item?")) deleteProduct(id).then(() => loadProducts(selectedCategory.id))
                                                    }}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a category to manage items
                        </div>
                    )}
                </div>

                {/* Category Modal */}
                <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input
                                    value={catForm.name}
                                    onChange={e => {
                                        const val = e.target.value
                                        if (val.length > 30) {
                                            toast.error("Name cannot exceed 30 characters")
                                            return
                                        }
                                        if (!/^[a-zA-Z\s]*$/.test(val)) {
                                            toast.error("Only alphabets are allowed")
                                            return
                                        }
                                        setCatForm({ ...catForm, name: val })
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>Active</Label>
                                <Switch checked={catForm.isActive} onCheckedChange={c => setCatForm({ ...catForm, isActive: c })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleDeleteCategory(editingCategory?.id)} disabled={isSaving}>Delete</Button>
                            <Button onClick={handleSaveCategory} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Product Modal */}
                <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
                        </DialogHeader>

                        <Tabs defaultValue="details">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="addons">Add-ons</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={prodForm.name}
                                            onChange={e => {
                                                const val = e.target.value
                                                if (val.length > 30) {
                                                    toast.error("Name cannot exceed 30 characters")
                                                    return
                                                }
                                                if (!/^[a-zA-Z\s]*$/.test(val)) {
                                                    toast.error("Only alphabets are allowed")
                                                    return
                                                }
                                                setProdForm({ ...prodForm, name: val })
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price</Label>
                                        <Input
                                            type="number"
                                            value={prodForm.price}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value)
                                                if (val > 5000) {
                                                    toast.error("Price cannot exceed 5000")
                                                    return
                                                }
                                                if (e.target.value && val < 0) return
                                                setProdForm({ ...prodForm, price: e.target.value })
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label>Available</Label>
                                        <Switch checked={prodForm.isAvailable} onCheckedChange={c => setProdForm({ ...prodForm, isAvailable: c })} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="addons" className="space-y-4 py-4">
                                <div className="flex gap-2 items-end border-b border-gray-100 pb-4">
                                    <div className="space-y-1 flex-1">
                                        <Label>Add-on Name</Label>
                                        <Input
                                            placeholder="Extra Cheese"
                                            value={newAddon.name}
                                            onChange={e => {
                                                const val = e.target.value
                                                if (val.length > 30) {
                                                    toast.error("Name cannot exceed 30 characters")
                                                    return
                                                }
                                                if (!/^[a-zA-Z\s]*$/.test(val)) {
                                                    toast.error("Only alphabets are allowed")
                                                    return
                                                }
                                                setNewAddon({ ...newAddon, name: val })
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1 w-24">
                                        <Label>Price</Label>
                                        <Input
                                            type="number"
                                            placeholder="20"
                                            value={newAddon.price}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value)
                                                if (val > 5000) {
                                                    toast.error("Add-on price cannot exceed 5000")
                                                    return
                                                }
                                                if (e.target.value && val < 0) return
                                                setNewAddon({ ...newAddon, price: e.target.value })
                                            }}
                                        />
                                    </div>
                                    <Button onClick={handleAddAddon}>Add</Button>
                                </div>

                                <div className="space-y-2">
                                    {addons.length === 0 ? <p className="text-sm text-gray-500">No add-ons yet.</p> : addons.map((addon: any) => (
                                        <div key={addon.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <div className={cn("flex-1", !addon.isAvailable && "opacity-50 line-through decoration-gray-400")}>
                                                <p className="font-semibold text-sm">{addon.name}</p>
                                                <p className="text-xs text-gray-500">{currency.symbol}{addon.price}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={addon.isAvailable} onCheckedChange={() => handleToggleAddon(addon)} />
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteAddon(addon.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button onClick={handleSaveProduct} disabled={isSaving}>{isSaving ? "Saving..." : "Save Product"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DndContext>
    )
}
