'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Utensils, Users, Info, Clock, ArrowLeftRight, Merge } from "lucide-react"
import { transferTable, mergeTables } from "@/app/actions/restaurant"
import { toast } from "sonner"

interface PosTableMapProps {
    initialFloors: any[]
}

export function PosTableMap({ initialFloors }: PosTableMapProps) {
    const router = useRouter()
    const [floors] = useState(initialFloors)
    const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id || "")

    // Modes: VIEW (default), TRANSFER, MERGE
    const [mode, setMode] = useState<'VIEW' | 'TRANSFER' | 'MERGE'>('VIEW')
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

    const activeFloor = floors.find(f => f.id === activeFloorId)

    const handleTableClick = async (table: any) => {
        if (mode === 'VIEW') {
            router.push(`/dashboard/new-order?tableId=${table.id}&tableName=${table.name}`)
            return
        }

        if (mode === 'TRANSFER') {
            if (!selectedTableId) {
                // Select Source
                if (table.status !== 'OCCUPIED' && table.status !== 'CLEANING') {
                    toast.error("Source table must be occupied")
                    return
                }
                setSelectedTableId(table.id)
                toast.info(`Selected ${table.name}. Now select target table.`)
            } else {
                // Select Target
                if (table.id === selectedTableId) {
                    setSelectedTableId(null) // Deselect
                    return
                }

                if (confirm(`Transfer ${selectedTableId} to ${table.name}?`)) {
                    const res = await transferTable(selectedTableId, table.id)
                    if (res.success) {
                        toast.success("Table transferred")
                        setMode('VIEW')
                        setSelectedTableId(null)
                        window.location.reload()
                    } else {
                        toast.error(res.error || "Transfer failed")
                    }
                }
            }
        }

        if (mode === 'MERGE') {
            if (!selectedTableId) {
                // Select Source
                if (table.status !== 'OCCUPIED') {
                    toast.error("Source table must be occupied")
                    return
                }
                setSelectedTableId(table.id)
                toast.info(`Selected ${table.name}. Now select target table.`)
            } else {
                if (table.id === selectedTableId) {
                    setSelectedTableId(null)
                    return
                }

                if (confirm(`Merge ${selectedTableId} into ${table.name}?`)) {
                    const res = await mergeTables(selectedTableId, table.id)
                    if (res.success) {
                        toast.success("Tables merged")
                        setMode('VIEW')
                        setSelectedTableId(null)
                        window.location.reload()
                    } else {
                        toast.error(res.error || "Merge failed")
                    }
                }
            }
        }
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Toolbar */}
            <div className="flex justify-between items-center">
                {/* Floor Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {floors.map(f => (
                        <Button
                            key={f.id}
                            variant={activeFloorId === f.id ? "default" : "outline"}
                            onClick={() => setActiveFloorId(f.id)}
                            className="min-w-[100px]"
                        >
                            {f.name}
                        </Button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant={mode === 'TRANSFER' ? 'default' : 'secondary'}
                        onClick={() => { setMode('TRANSFER'); setSelectedTableId(null); }}
                    >
                        <ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer
                    </Button>
                    <Button
                        variant={mode === 'MERGE' ? 'default' : 'secondary'}
                        onClick={() => { setMode('MERGE'); setSelectedTableId(null); }}
                    >
                        <Merge className="w-4 h-4 mr-2" /> Merge
                    </Button>
                    {mode !== 'VIEW' && (
                        <Button variant="ghost" onClick={() => { setMode('VIEW'); setSelectedTableId(null); }}>Cancel</Button>
                    )}
                </div>
            </div>

            {/* Visual Canvas */}
            <div className="flex-1 bg-slate-100 rounded-xl relative overflow-hidden border border-slate-200">
                {activeFloor ? (
                    <>
                        {activeFloor.tables.map((table: any) => {
                            const isOccupied = table.status === 'OCCUPIED'
                            const isReserved = table.status === 'RESERVED'
                            const isSelected = selectedTableId === table.id

                            return (
                                <button
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={cn(
                                        "absolute border-2 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm",
                                        isSelected ? "ring-4 ring-offset-2 ring-blue-600 border-blue-600 z-10" : "", // Highlight selection
                                        isOccupied ? "bg-blue-50 border-blue-400 text-blue-800" :
                                            isReserved ? "bg-amber-50 border-amber-400 text-amber-800" :
                                                "bg-white border-slate-300 text-slate-700 hover:border-green-400 hover:bg-green-50"
                                    )}
                                    style={{
                                        left: table.x,
                                        top: table.y,
                                        width: 100, // Fixed visual size for consistency in MVP
                                        height: 100
                                    }}
                                >
                                    <span className="font-bold text-lg">{table.name}</span>
                                    <div className="flex items-center gap-1 text-xs opacity-70">
                                        <Users className="w-3 h-3" /> {table.capacity}
                                    </div>

                                    {isOccupied && (
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-md">
                                            <Utensils className="w-3 h-3" />
                                        </div>
                                    )}

                                    {isReserved && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-md">
                                            <Clock className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}

                        {activeFloor.tables.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Info className="w-12 h-12 mb-2 opacity-20" />
                                <p>No tables configured on this floor.</p>
                                <Button variant="link" onClick={() => router.push('/dashboard/floors')}>Go to Floor Setup</Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <p>No floors found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
