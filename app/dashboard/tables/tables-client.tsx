"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Trash2, RotateCcw, Loader2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { addTable, deleteTable, updateTableStatus } from "@/app/actions/tables"
import { useRouter } from "next/navigation"
import { getPOSService } from "@/lib/pos-service"
import { useElapsedTimer } from "@/hooks/use-elapsed-timer"

// Timer component for individual table
function TableTimer({ startTime }: { startTime: string | null }) {
    const elapsed = useElapsedTimer(startTime)
    if (!elapsed) return null
    return (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full shadow-sm">
            <Clock className="h-3 w-3" />
            <span>{elapsed}</span>
        </div>
    )
}

type Table = {
    id: string
    name: string
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
    heldOrderCreatedAt?: string | null
    heldOrderId?: string | null
}

interface TablesClientProps {
    initialTables: Table[]
}

export default function TablesClient({ initialTables }: TablesClientProps) {
    const [tables, setTables] = useState<Table[]>(initialTables)

    // Sync with server data when initialTables changes (navigation back to page)
    useEffect(() => {
        if (initialTables.length > 0) {
            setTables(initialTables)
        } else {
            // Fallback to local cache if server data is empty (offline scenario)
            const loadLocal = async () => {
                const posService = getPOSService()
                const local = await posService.getTables()
                if (local && local.length > 0) {
                    setTables(local as Table[])
                }
            }
            loadLocal()
        }
    }, [initialTables])
    // user prop is available if needed, though previously it was only used to set state.

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [floorName, setFloorName] = useState("")
    const [tableNumber, setTableNumber] = useState("")
    const [newTableCapacity, setNewTableCapacity] = useState(4)
    const router = useRouter()
    const [adding, setAdding] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [vacatingId, setVacatingId] = useState<string | null>(null)

    const handleAddTable = async () => {
        if (!tableNumber || adding) return
        setAdding(true)

        const finalName = floorName.trim()
            ? `${floorName.trim()} Table ${tableNumber}`
            : `Table ${tableNumber}`

        try {
            const newTable = await addTable(finalName, newTableCapacity)
            setTables(prev => [...prev, newTable])
            // Keep floor name for easier sequential adding
            setTableNumber("")
            setNewTableCapacity(4)
            setIsAddOpen(false)
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this table?")) {
            setDeletingId(id)
            try {
                await deleteTable(id)
                setTables(prev => prev.filter(t => t.id !== id))
            } finally {
                setDeletingId(null)
            }
        }
    }

    const handleVacant = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setVacatingId(id)
        try {
            const updatedTable = await updateTableStatus(id, 'AVAILABLE')
            // Clear held order info when marking as vacant
            setTables(prev => prev.map(t => t.id === id ? {
                ...t,
                ...updatedTable,
                heldOrderCreatedAt: null,
                heldOrderId: null
            } : t))
        } finally {
            setVacatingId(null)
        }
    }

    const handleTableClick = (table: Table) => {
        // If table has a held order, resume it instead of starting new
        if (table.heldOrderId) {
            router.push(`/dashboard/new-order?resumeOrderId=${table.heldOrderId}&tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
        } else {
            router.push(`/dashboard/new-order?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
        }
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
                    <p className="text-gray-500">Manage your floor plan and track occupancy</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                            <Plus className="h-4 w-4" /> Add Table
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Table</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Floor / Area</label>
                                    <Input
                                        value={floorName}
                                        onChange={(e) => setFloorName(e.target.value)}
                                        placeholder="e.g. Ground Floor"
                                        list="floor-options"
                                    />
                                    <datalist id="floor-options">
                                        <option value="Ground Floor" />
                                        <option value="First Floor" />
                                        <option value="Second Floor" />
                                        <option value="Third Floor" />
                                        <option value="Terrace" />
                                        <option value="Garden" />
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Table Number</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">Table</span>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="pl-14"
                                            value={tableNumber}
                                            onChange={(e) => setTableNumber(e.target.value)}
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">Preview Name:</span>
                                <span className="font-bold text-gray-900">
                                    {floorName ? `${floorName} Table ${tableNumber}` : tableNumber ? `Table ${tableNumber}` : '...'}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Capacity (Pax)</label>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setNewTableCapacity(Math.max(1, newTableCapacity - 1))}>-</Button>
                                    <span className="font-bold w-8 text-center">{newTableCapacity}</span>
                                    <Button variant="outline" size="icon" onClick={() => setNewTableCapacity(Math.min(30, newTableCapacity + 1))} disabled={newTableCapacity >= 30}>+</Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="button" onClick={handleAddTable} className="bg-orange-600 text-white">Save Table</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.map(table => {
                    const hasHeldOrder = !!table.heldOrderCreatedAt
                    return (
                        <div
                            key={table.id}
                            onClick={() => handleTableClick(table)}
                            className={cn(
                                "relative min-h-[140px] p-4 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md group active:scale-95",
                                hasHeldOrder
                                    ? "bg-amber-50 border-amber-300"
                                    : table.status === 'OCCUPIED'
                                        ? "bg-yellow-50 border-yellow-200"
                                        : table.status === 'RESERVED'
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-white border-gray-100 hover:border-orange-200"
                            )}
                        >
                            {/* Timer for held orders */}
                            {hasHeldOrder && <TableTimer startTime={table.heldOrderCreatedAt!} />}

                            {/* Status Badge */}
                            <div className={cn(
                                "absolute top-3 right-3 h-3 w-3 rounded-full shadow-sm",
                                hasHeldOrder ? "bg-amber-500" : table.status === 'OCCUPIED' ? "bg-yellow-500" : table.status === 'RESERVED' ? "bg-blue-500" : "bg-green-500"
                            )} />

                            <h3 className="text-lg font-bold text-gray-800 mb-1 text-center leading-tight break-words w-full px-2">{table.name}</h3>
                            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                <Users className="h-4 w-4" />
                                <span>{table.capacity} Pax</span>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(table.status === 'OCCUPIED' || hasHeldOrder) && (
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8 bg-white hover:bg-yellow-100 text-yellow-600 shadow-sm"
                                        onClick={(e) => handleVacant(e, table.id)}
                                        title="Mark as Vacant"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-8 w-8 shadow-sm"
                                    onClick={(e) => handleDelete(e, table.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div >
    )
}
