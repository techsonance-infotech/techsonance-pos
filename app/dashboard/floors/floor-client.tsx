'use client'

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { createFloor, createTable, updateTableLayout } from "@/app/actions/restaurant"
import { toast } from "sonner"
import { Plus, LayoutGrid, Move } from "lucide-react"

interface FloorClientProps {
    initialFloors: any[]
}

export function FloorClient({ initialFloors }: FloorClientProps) {
    const [floors, setFloors] = useState(initialFloors)
    const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id || "")

    // New Table State
    const [newTableName, setNewTableName] = useState("")
    const [newTableCap, setNewTableCap] = useState(4)

    // New Floor State
    const [newFloorName, setNewFloorName] = useState("")

    const handleAddFloor = async () => {
        if (!newFloorName) return
        const res = await createFloor(newFloorName)
        if (res.success) {
            toast.success("Floor created")
            // Ideally re-fetch or rely on server action revalidate + router.refresh
            window.location.reload()
        }
    }

    const handleAddTable = async () => {
        if (!newTableName || !activeFloorId) return
        const res = await createTable(newTableName, newTableCap, activeFloorId)
        if (res.success) {
            toast.success("Table created")
            window.location.reload()
        }
    }

    // Simple Drag Logic (Click to Move mostly for MVP)
    // We will just expose X/Y inputs for now to avoid complex D&D code in this file

    const activeFloor = floors.find(f => f.id === activeFloorId)

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {floors.map(f => (
                    <Button
                        key={f.id}
                        variant={activeFloorId === f.id ? "default" : "outline"}
                        onClick={() => setActiveFloorId(f.id)}
                    >
                        {f.name}
                    </Button>
                ))}

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost"><Plus className="w-4 h-4 mr-1" /> Add Floor</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Floor</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input placeholder="Floor Name (e.g. Terrace)" value={newFloorName} onChange={e => setNewFloorName(e.target.value)} />
                            <Button onClick={handleAddFloor}>Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {activeFloor ? (
                <div className="flex-1 flex gap-4">
                    {/* Sidebar Tools */}
                    <Card className="w-64 bg-slate-50">
                        <CardContent className="p-4 space-y-4">
                            <h3 className="font-semibold flex items-center"><LayoutGrid className="w-4 h-4 mr-2" /> Toolbox</h3>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Add Table</label>
                                <Input placeholder="Name (T1)" value={newTableName} onChange={e => setNewTableName(e.target.value)} />
                                <Input type="number" placeholder="Capacity" value={newTableCap} onChange={e => setNewTableCap(parseInt(e.target.value))} />
                                <Button className="w-full" onClick={handleAddTable}>Add to Floor</Button>
                            </div>

                            <hr />

                            <div className="text-xs text-muted-foreground">
                                <p><strong>Tip:</strong> Dragging disabled in MVP.</p>
                                <p>Tables auto-stack at (0,0).</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Canvas */}
                    <div className="flex-1 bg-slate-200 rounded-lg relative overflow-hidden border-2 border-dashed border-slate-300 min-h-[500px]">
                        {activeFloor.tables.map((table: any) => (
                            <div
                                key={table.id}
                                className="absolute bg-white border-2 border-slate-400 rounded-lg shadow-sm flex flex-col items-center justify-center cursor-move hover:border-blue-500 transition-colors"
                                style={{
                                    left: table.x,
                                    top: table.y,
                                    width: 80,
                                    height: 80
                                }}
                            // Make draggable later
                            >
                                <span className="font-bold">{table.name}</span>
                                <span className="text-xs text-slate-500">{table.capacity} pax</span>
                            </div>
                        ))}

                        {activeFloor.tables.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                No tables on this floor yet.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Select or create a floor to begin.</p>
                </div>
            )}
        </div>
    )
}
