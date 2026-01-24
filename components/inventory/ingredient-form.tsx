'use client'

import { createIngredient } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function IngredientForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await createIngredient(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Ingredient added successfully")
            router.push("/dashboard/inventory")
            router.refresh()
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
                <Label htmlFor="name">Ingredient Name</Label>
                <Input id="name" name="name" placeholder="e.g. Flour, Sugar, Tomato" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select name="unit" required defaultValue="kg">
                        <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="gm">Gram (gm)</SelectItem>
                            <SelectItem value="ltr">Liter (ltr)</SelectItem>
                            <SelectItem value="ml">Milliliter (ml)</SelectItem>
                            <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (Per unit)</Label>
                    <Input id="costPrice" name="costPrice" type="number" step="0.01" min="0" placeholder="0.00" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="minStock">Reorder Level (Min Stock)</Label>
                <Input id="minStock" name="minStock" type="number" step="0.01" min="0" placeholder="Alert when stock goes below..." required />
                <p className="text-xs text-muted-foreground">You will get alerts when stock falls below this quantity.</p>
            </div>

            <div className="pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Create Ingredient"}
                </Button>
            </div>
        </form>
    )
}
