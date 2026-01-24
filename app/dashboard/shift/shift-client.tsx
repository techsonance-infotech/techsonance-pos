'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { openShift, closeShift, addCashTransaction } from "@/app/actions/shift"
import { toast } from "sonner"
import { Coins, ArrowDownLeft, ArrowUpRight, Lock, Printer, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface ShiftClientProps {
    initialShift: any
    initialSummary: any
    userName: string
    userRole: string
}

export function ShiftClient({ initialShift, initialSummary, userName }: ShiftClientProps) {
    const [shift, setShift] = useState(initialShift)
    const [summary, setSummary] = useState(initialSummary)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Open Shift State
    const [openingBalance, setOpeningBalance] = useState("0")

    // Transaction State
    const [txType, setTxType] = useState<string>('EXPENSE')
    const [txAmount, setTxAmount] = useState("")
    const [txReason, setTxReason] = useState("")

    // Close Shift State
    const [closingBalance, setClosingBalance] = useState("")
    const [denominations, setDenominations] = useState<Record<string, number>>({})
    const [closingNotes, setClosingNotes] = useState("")
    const [showCloseDialog, setShowCloseDialog] = useState(false)

    // Handlers
    const handleOpenShift = async () => {
        setIsLoading(true)
        const res = await openShift(parseFloat(openingBalance) || 0)
        setIsLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Shift Opened Successfully")
            setShift(res.shift)
            router.refresh()
        }
    }

    const handleTransaction = async () => {
        setIsLoading(true)
        const res = await addCashTransaction({
            type: txType as any,
            amount: parseFloat(txAmount) || 0,
            reason: txReason
        })
        setIsLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Transaction Record Saved")
            setTxAmount("")
            setTxReason("")
            router.refresh()
        }
    }

    const handleDenominationChange = (value: string, count: string) => {
        const newDenoms = { ...denominations, [value]: parseInt(count) || 0 }
        setDenominations(newDenoms)

        // Auto update closing balance
        const total = Object.entries(newDenoms).reduce((sum, [val, cnt]) => sum + (parseInt(val) * cnt), 0)
        setClosingBalance(total.toString())
    }

    const calculateTotal = () => {
        return Object.entries(denominations).reduce((sum, [val, cnt]) => sum + (parseInt(val) * cnt), 0)
    }

    const handleCloseShift = async () => {
        setIsLoading(true)
        const res = await closeShift({
            closingBalance: parseFloat(closingBalance) || 0,
            denominations,
            notes: closingNotes
        })
        setIsLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            const status = res.shift?.status
            if (status === 'REVIEW') {
                toast.warning("Shift Closed with Review Flag (High Variance)")
            } else {
                toast.success("Shift Closed Successfully")
            }
            setShowCloseDialog(false)
            setShift(null)
            router.refresh()
        }
    }

    if (!shift || shift.status !== 'OPEN') {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-6">
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">No Active Shift</h3>
                    <p className="text-muted-foreground">Hello {userName}, please open a shift to start POS operations.</p>
                </div>

                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Open New Shift</CardTitle>
                        <CardDescription>Enter the opening cash in the drawer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Opening Cash Amount (₹)</Label>
                            <Input
                                type="number"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleOpenShift} disabled={isLoading}>
                            {isLoading ? "Opening..." : "Open Shift"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.openingBalance || shift.openingBalance}</div>
                        <p className="text-xs text-muted-foreground">
                            Started {format(new Date(shift.startTime), "HH:mm")}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.sales?.CASH || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total Sales: ₹{summary?.totalSales || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash In/Out</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+₹{summary?.cashIn || 0}</div>
                        <div className="text-sm font-bold text-red-600">-₹{(summary?.cashOut || 0) + (summary?.cashDrop || 0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expected In Drawer</CardTitle>
                        <Printer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">₹{summary?.expectedCash || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Verify this amount at closing
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Close Shift Section */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Cash Management</CardTitle>
                        <CardDescription>Manage daily expenses and drawer operations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="expense" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="expense" onClick={() => setTxType('EXPENSE')}>Expense / Out</TabsTrigger>
                                <TabsTrigger value="drop" onClick={() => setTxType('CASH_DROP')}>Cash Drop</TabsTrigger>
                                <TabsTrigger value="in" onClick={() => setTxType('CASH_IN')}>Cash In</TabsTrigger>
                            </TabsList>
                            <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={txAmount}
                                            onChange={(e) => setTxAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason / Note</Label>
                                        <Input
                                            placeholder="e.g. Supplier Payment, Petty Cash"
                                            value={txReason}
                                            onChange={(e) => setTxReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleTransaction} disabled={isLoading}>
                                    {isLoading ? "Processing..." : `Record ${txType.replace('_', ' ')}`}
                                </Button>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Report Section */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>End of Shift</CardTitle>
                        <CardDescription>
                            Ready to close? Count your cash drawer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="w-full h-12 text-lg">
                                    Close Shift
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Close Shift & Reconcile</DialogTitle>
                                    <DialogDescription>
                                        Enter the specific count of each denomination in the drawer.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid grid-cols-2 gap-6 py-4">
                                    {/* Denomination Inputs */}
                                    <div className="space-y-2 border-r pr-4">
                                        <Label className="text-xs uppercase text-muted-foreground">Denominations</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['500', '200', '100', '50', '20', '10', 'Coins'].map((denom) => (
                                                <div key={denom} className="flex items-center gap-2">
                                                    <span className="w-12 text-sm font-medium">{denom === 'Coins' ? '' : '₹'}{denom}</span>
                                                    <Input
                                                        type="number"
                                                        className="h-8"
                                                        placeholder="Qty"
                                                        value={denominations[denom] || ''}
                                                        onChange={(e) => handleDenominationChange(denom, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary & Variance */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>Total Counted</Label>
                                            <div className="text-3xl font-bold">₹{calculateTotal()}</div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Expected Amount</Label>
                                            <div className="text-xl font-medium text-muted-foreground">₹{summary?.expectedCash || 0}</div>
                                        </div>

                                        {calculateTotal() - (summary?.expectedCash || 0) !== 0 && (
                                            <div className={`p-3 rounded-md flex items-start gap-2 ${calculateTotal() - (summary?.expectedCash || 0) < 0 ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'}`}>
                                                <AlertTriangle className="h-5 w-5 mt-0.5" />
                                                <div>
                                                    <div className="font-bold">Variance: {calculateTotal() - (summary?.expectedCash || 0) > 0 ? '+' : ''}₹{calculateTotal() - (summary?.expectedCash || 0)}</div>
                                                    <p className="text-xs mt-1">
                                                        {calculateTotal() < (summary?.expectedCash || 0)
                                                            ? "Cash is SHORT. Please explain."
                                                            : "Cash is OVER. Please explain."}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label>Closing Notes (Required if Variance)</Label>
                                            <Textarea
                                                value={closingNotes}
                                                onChange={(e) => setClosingNotes(e.target.value)}
                                                placeholder="Explain any discrepancies..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
                                    <Button onClick={handleCloseShift} disabled={isLoading || (Math.abs(calculateTotal() - (summary?.expectedCash || 0)) > 0 && !closingNotes)}>
                                        {isLoading ? "Closing..." : "Finalize & Close"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
