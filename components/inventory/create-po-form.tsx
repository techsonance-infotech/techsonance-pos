'use client'

import { getInventoryItems } from "@/app/actions/inventory"
import { createPurchaseOrder } from "@/app/actions/purchase-orders"
import { getSuppliers } from "@/app/actions/suppliers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function CreatePOForm() {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [ingredients, setIngredients] = useState<any[]>([])

    // Form State
    const [supplierId, setSupplierId] = useState("")
    const [items, setItems] = useState<{ id: string, name: string, quantity: number, price: number }[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Load Data
    useEffect(() => {
        const load = async () => {
            const [s, i] = await Promise.all([getSuppliers(), getInventoryItems()])
            setSuppliers(s)
            setIngredients(i)
        }
        load()
    }, [])

    const addItem = () => {
        setItems([...items, { id: "", name: "", quantity: 1, price: 0 }])
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        if (field === 'id') {
            const selected = ingredients.find(ing => ing.id === value)
            newItems[index] = {
                ...newItems[index],
                id: value,
                name: selected?.name || "",
                price: selected?.costPrice || 0
            }
        } else {
            // @ts-ignore
            newItems[index][field] = value
        }
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }

    const handleSubmit = async () => {
        if (!supplierId) return toast.error("Please select a supplier")
        if (items.length === 0) return toast.error("Please add at least one item")
        if (items.some(i => !i.id || i.quantity <= 0)) return toast.error("Please ensure all items are valid")

        setIsSubmitting(true)
        const result = await createPurchaseOrder({
            supplierId,
            items: items.map(i => ({
                ingredientId: i.id,
                name: i.name,
                quantity: Number(i.quantity),
                price: Number(i.price)
            }))
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Purchase Order created!")
            router.push("/dashboard/inventory/purchase-orders")
        }
        setIsSubmitting(false)
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Select Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose Vendor" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4 space-y-1">
                                <Label>Item</Label>
                                <Select value={item.id} onValueChange={(v) => updateItem(index, 'id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Search..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ingredients.map(ing => (
                                            <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label>Qty</Label>
                                <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    min="0.1"
                                    step="0.1"
                                />
                            </div>
                            <div className="col-span-3 space-y-1">
                                <Label>Cost</Label>
                                <Input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                                    min="0"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label>Total</Label>
                                <div className="h-10 flex items-center px-3 border rounded bg-muted">
                                    {Number((item.quantity * item.price).toFixed(2))}
                                </div>
                            </div>
                            <div className="col-span-1">
                                <Button variant="destructive" size="icon" onClick={() => removeItem(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" onClick={addItem} className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold">₹{calculateTotal().toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create & Send Order"}
                </Button>
            </div>
        </div>
    )
}
