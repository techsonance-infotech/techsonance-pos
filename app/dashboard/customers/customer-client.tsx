'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, Coins, History, Gift } from "lucide-react"
import { createOrUpdateCustomer, addLoyaltyPoints, redeemLoyaltyPoints } from "@/app/actions/crm"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface CustomerClientProps {
    initialCustomers: any[]
}

export function CustomerClient({ initialCustomers }: CustomerClientProps) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [search, setSearch] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [pointsToAdjust, setPointsToAdjust] = useState(100)

    // Add New Customer State
    const [newMobile, setNewMobile] = useState("")
    const [newName, setNewName] = useState("")

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.mobile.includes(search)
    )

    const handleCreate = async () => {
        if (!newMobile) return
        const res = await createOrUpdateCustomer(newMobile, newName)
        if (res.customer) {
            setCustomers([res.customer, ...customers])
            toast.success("Customer created")
            setNewMobile("")
            setNewName("")
        } else {
            toast.error("Failed to create customer")
        }
    }

    const handlePoints = async (type: 'EARN' | 'REDEEM') => {
        if (!selectedCustomer) return

        let res
        if (type === 'EARN') {
            res = await addLoyaltyPoints(selectedCustomer.id, pointsToAdjust, 'MANUAL_ADJUSTMENT')
        } else {
            res = await redeemLoyaltyPoints(selectedCustomer.id, pointsToAdjust)
        }

        if (res.success) {
            toast.success(type === 'EARN' ? "Points Added" : "Points Redeemed")
            // Update local state simply
            const updated = {
                ...selectedCustomer,
                loyaltyPoints: type === 'EARN'
                    ? selectedCustomer.loyaltyPoints + pointsToAdjust
                    : selectedCustomer.loyaltyPoints - pointsToAdjust
            }
            setSelectedCustomer(updated)
            setCustomers(customers.map(c => c.id === updated.id ? updated : c))
        } else {
            toast.error(res.error || "Action failed")
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">

            {/* Left: List */}
            <Card className="col-span-1 flex flex-col h-full">
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by mobile or name..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full mb-2 border-dashed">
                                <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Customer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Mobile Number</Label>
                                    <Input value={newMobile} onChange={(e) => setNewMobile(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                                </div>
                                <Button onClick={handleCreate}>Save Customer</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {filtered.map(customer => (
                        <div
                            key={customer.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-100 transition-colors ${selectedCustomer?.id === customer.id ? 'bg-slate-100 border-primary' : ''}`}
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold">
                                {customer.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="font-medium truncate">{customer.name || 'Guest'}</div>
                                <div className="text-xs text-muted-foreground">{customer.mobile}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-amber-600 flex items-center justify-end gap-1">
                                    <Coins className="w-3 h-3" /> {customer.loyaltyPoints}
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Right: Details */}
            <Card className="col-span-2 flex flex-col h-full">
                {selectedCustomer ? (
                    <>
                        <CardHeader className="border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{selectedCustomer.name}</CardTitle>
                                    <CardDescription>{selectedCustomer.mobile}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-amber-600 flex items-center gap-2">
                                        <Coins className="w-8 h-8" /> {selectedCustomer.loyaltyPoints}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Available Points</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-6 space-y-8">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground uppercase">Total Spend</div>
                                    <div className="text-2xl font-bold">₹{selectedCustomer.totalSpend?.toFixed(0)}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground uppercase">Visits</div>
                                    <div className="text-2xl font-bold">{selectedCustomer.visitCount}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground uppercase">Last Visit</div>
                                    <div className="text-2xl font-bold text-sm pt-2">
                                        {new Date(selectedCustomer.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-8 border-t pt-8">
                                <div className="space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Gift className="w-4 h-4" /> Manual Adjustment
                                    </h4>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={pointsToAdjust}
                                            onChange={(e) => setPointsToAdjust(parseInt(e.target.value))}
                                            className="w-24"
                                        />
                                        <Button size="sm" onClick={() => handlePoints('EARN')}>Add</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handlePoints('REDEEM')}>Deduct</Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Use this to correct errors or provide service recovery bonus.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <History className="w-4 h-4" /> Recent History
                                    </h4>
                                    <div className="text-sm text-muted-foreground italic">
                                        Transaction history view logic requires separate fetch.
                                        (For MVP, relying on global updates).
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Coins className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a customer to view details</p>
                    </div>
                )}
            </Card>
        </div>
    )
}
