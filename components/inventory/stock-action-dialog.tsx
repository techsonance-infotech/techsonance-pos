'use client'

import { adjustStock } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeftRight } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface StockActionDialogProps {
    ingredientId: string
    ingredientName: string
    currentStock: number
    unit: string
}

export function StockActionDialog({ ingredientId, ingredientName, currentStock, unit }: StockActionDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [type, setType] = useState<'IN' | 'OUT' | 'WASTAGE'>('IN')

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const quantity = parseFloat(formData.get('quantity') as string)
        const reason = formData.get('reason') as string

        const result = await adjustStock(ingredientId, quantity, type, reason)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Stock ${type === 'IN' ? 'added' : 'deducted'} successfully`)
            setOpen(false)
        }

        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Adjust
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Stock: {ingredientName}</DialogTitle>
                    <DialogDescription>
                        Current Stock: {currentStock} {unit}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Action
                        </Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IN">Stock In (Purchase/Add)</SelectItem>
                                <SelectItem value="OUT">Stock Out (Correction)</SelectItem>
                                <SelectItem value="WASTAGE">Wastage (Damaged/Expired)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="col-span-3"
                                placeholder="0.00"
                                required
                            />
                            <span className="text-sm text-muted-foreground">{unit}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            Reason
                        </Label>
                        <Textarea
                            id="reason"
                            name="reason"
                            className="col-span-3"
                            placeholder="Optional note..."
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Confirm Adjustment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
