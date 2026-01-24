"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Copy, Calculator, Users, Banknote } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { useCurrency } from "@/lib/hooks/use-currency"
import { toast } from "sonner"

interface SplitBillModalProps {
    isOpen: boolean
    onClose: () => void
    totalAmount: number
    currencySymbol: string
}

export function SplitBillModal({ isOpen, onClose, totalAmount, currencySymbol }: SplitBillModalProps) {
    const [splitCount, setSplitCount] = useState<number>(2)

    // Calculated Split
    const splitAmount = totalAmount / splitCount

    const copyToClipboard = (amount: number) => {
        navigator.clipboard.writeText(amount.toFixed(2))
        toast.success("Amount copied to clipboard")
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Split Bill</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="equal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="equal">Split Equally</TabsTrigger>
                        <TabsTrigger value="custom" disabled>By Items (Pro)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="equal" className="space-y-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="total">Total Bill</Label>
                                <Input
                                    id="total"
                                    value={formatCurrency(totalAmount, currencySymbol)}
                                    readOnly
                                    className="font-bold bg-muted"
                                />
                            </div>
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="people">No. of People</Label>
                                <div className="flex items-center">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 rounded-r-none"
                                        onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                                    >
                                        -
                                    </Button>
                                    <div className="h-9 flex-1 flex items-center justify-center border-y border-input font-medium min-w-[3rem]">
                                        {splitCount}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 rounded-l-none"
                                        onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Amount per person</span>
                                <span className="font-bold text-2xl text-blue-600">
                                    {formatCurrency(splitAmount, currencySymbol)}
                                </span>
                            </div>
                            <div className="w-full h-px bg-slate-200 my-2" />
                            <div className="space-y-2">
                                {Array.from({ length: splitCount }).map((_, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span>Person {i + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{formatCurrency(splitAmount, currencySymbol)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(splitAmount)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="custom">
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Banknote className="h-10 w-10 mb-2 opacity-20" />
                            <p>Split by Items is available in Pro plan.</p>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
