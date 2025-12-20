"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Trash2, RotateCcw } from "lucide-react"
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
import { getTables, addTable, deleteTable, updateTableStatus } from "@/app/actions/tables"
import { getUserProfile } from "@/app/actions/user"
import { useRouter } from "next/navigation"

type Table = {
    id: string
    name: string
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
}

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([])
    const [user, setUser] = useState<any>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newTableName, setNewTableName] = useState("")
    const [newTableCapacity, setNewTableCapacity] = useState(4)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [profile, tableList] = await Promise.all([
            getUserProfile(),
            getTables()
        ])
        setUser(profile)
        setTables(tableList)
    }

    const handleAddTable = async () => {
        if (!newTableName) {
            // Basic validation
            return
        }

        const newTable = await addTable(newTableName, newTableCapacity)
        setTables(prev => [...prev, newTable])

        setNewTableName("")
        setNewTableCapacity(4)
        setIsAddOpen(false)
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this table?")) {
            await deleteTable(id)
            setTables(prev => prev.filter(t => t.id !== id))
        }
    }

    const handleVacant = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const updatedTable = await updateTableStatus(id, 'AVAILABLE')
        setTables(prev => prev.map(t => t.id === id ? updatedTable : t))
    }

    const handleTableClick = (table: Table) => {
        router.push(`/dashboard/new-order?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Table Name / Number</label>
                                <Input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="e.g. T1, Table 5, Patio 1"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Capacity (Pax)</label>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setNewTableCapacity(Math.max(1, newTableCapacity - 1))}>-</Button>
                                    <span className="font-bold w-8 text-center">{newTableCapacity}</span>
                                    <Button variant="outline" size="icon" onClick={() => setNewTableCapacity(newTableCapacity + 1)}>+</Button>
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
                {tables.map(table => (
                    <div
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className={cn(
                            "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md group active:scale-95",
                            table.status === 'OCCUPIED'
                                ? "bg-yellow-50 border-yellow-200"
                                : table.status === 'RESERVED'
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-white border-gray-100 hover:border-orange-200"
                        )}
                    >
                        {/* Status Badge */}
                        <div className={cn(
                            "absolute top-3 right-3 h-3 w-3 rounded-full shadow-sm",
                            table.status === 'OCCUPIED' ? "bg-yellow-500" : table.status === 'RESERVED' ? "bg-blue-500" : "bg-green-500"
                        )} />

                        <h3 className="text-2xl font-bold text-gray-800 mb-1">{table.name}</h3>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{table.capacity} Pax</span>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {table.status === 'OCCUPIED' && (
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
                ))}
            </div>
        </div>
    )
}
