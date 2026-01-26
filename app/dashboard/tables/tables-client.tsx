"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Users, Trash2, RotateCcw, Loader2, Clock, Eye, QrCode, Edit, LockKeyhole, ArrowRightLeft, X, LayoutGrid, List, Info } from "lucide-react"
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
import { addTable, deleteTable, updateTableStatus, getFloorsWithTables, getTablesForFloor, getTableQRToken, createFloor, updateFloor, deleteFloor, mergeTables, unmergeTable, transferTable, assignWaiter, getWaiters } from "@/app/actions/tables"
import { useRouter, usePathname } from "next/navigation"
import { useElapsedTimer } from "@/hooks/use-elapsed-timer"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { toast } from "sonner"

// ========== TYPES ==========
type FloorStats = {
    id: string
    name: string
    sortOrder: number
    totalTables: number
    occupiedCount: number
    availableCount: number
    reservedCount: number
}

type Table = {
    id: string
    name: string
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING'
    floorId?: string | null
    floorName?: string | null
    qrToken?: string | null
    heldOrderCreatedAt?: string | null
    heldOrderId?: string | null
    waiter?: { id: string; username: string } | null
    mergedWith?: { id: string; name: string } | null
    subTables?: { id: string; name: string }[]
}

// ========== SUBCOMPONENTS ==========

// Timer component for individual table
function TableTimer({ startTime }: { startTime: string | null }) {
    const elapsed = useElapsedTimer(startTime)
    if (!elapsed) return null
    return (
        <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>{elapsed}</span>
        </div>
    )
}

// Floor Tab Component - Compact Design with Edit/Delete
function FloorTab({ floor, isActive, onClick, index, onEdit, onDelete }: {
    floor: FloorStats & { id: string }
    isActive: boolean
    onClick: () => void
    index: number
    onEdit?: (floor: FloorStats & { id: string }) => void
    onDelete?: (floor: FloorStats & { id: string }) => void
}) {
    // Different icons for different floor types
    const getFloorIcon = (name: string, idx: number) => {
        const lowerName = name.toLowerCase()
        if (lowerName.includes('outdoor') || lowerName.includes('garden') || lowerName.includes('terrace')) return '🌳'
        if (lowerName.includes('ground')) return '🏠'
        if (lowerName.includes('first') || idx === 1) return '🏢'
        if (lowerName.includes('second') || idx === 2) return '🏛️'
        return '🏗️'
    }

    return (
        <div
            className={cn(
                "relative flex-shrink-0 rounded-xl border-2 transition-all cursor-pointer group min-w-[140px]",
                isActive
                    ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400 shadow-md ring-1 ring-orange-200/50"
                    : "bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm"
            )}
        >
            {/* Main Clickable Area */}
            <button
                onClick={onClick}
                className="w-full text-left px-4 py-3"
            >
                {/* Header with Icon and Name */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{getFloorIcon(floor.name, index)}</span>
                    <span className={cn(
                        "font-bold text-sm truncate",
                        isActive ? "text-orange-700" : "text-gray-800"
                    )}>{floor.name}</span>
                </div>

                {/* Stats Row */}
                <div className="text-xs flex items-center gap-1.5">
                    {isActive && <span className="text-green-500">✓</span>}
                    <span className={cn(
                        "font-medium",
                        isActive ? "text-green-600" : "text-gray-500"
                    )}>{floor.totalTables} Tables</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-green-600 font-semibold">{floor.availableCount} Free</span>
                </div>
            </button>

            {/* Hover Actions - Edit/Delete */}
            {(onEdit || onDelete) && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(floor); }}
                            className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Edit Floor"
                        >
                            <Edit className="h-3 w-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(floor); }}
                            className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete Floor"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// Status Filter Pill - With colored dots matching reference design
function StatusPill({ label, count, isActive, color, onClick }: {
    label: string
    count: number
    isActive: boolean
    color: 'all' | 'occupied' | 'available' | 'reserved'
    onClick: () => void
}) {
    const colorConfig = {
        all: { dot: 'bg-orange-500', active: 'bg-orange-500 text-white', inactive: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50' },
        occupied: { dot: 'bg-amber-500', active: 'bg-amber-500 text-white', inactive: 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50' },
        available: { dot: 'bg-green-500', active: 'bg-green-500 text-white', inactive: 'bg-white text-gray-700 border border-gray-200 hover:bg-green-50' },
        reserved: { dot: 'bg-blue-500', active: 'bg-blue-500 text-white', inactive: 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50' }
    }

    const config = colorConfig[color]

    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-sm",
                isActive ? config.active : config.inactive
            )}
        >
            <span className={cn("h-2.5 w-2.5 rounded-full", isActive ? 'bg-white' : config.dot)} />
            {label}
            <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold",
                isActive ? "bg-white/20" : "bg-gray-100"
            )}>({count})</span>
        </button>
    )
}

// Enhanced Table Card - Matches Reference Design Exactly
// Enhanced Table Card - Matches Reference Design Exactly
function TableCard({ table, onClick, onSettings, onVacate, onDelete, isDeleting, isOnline }: {
    table: Table
    onClick: () => void
    onSettings: (e: React.MouseEvent) => void
    onVacate: (e: React.MouseEvent) => void
    onDelete: (e: React.MouseEvent) => void
    isDeleting: boolean
    isOnline: boolean
}) {
    const hasHeldOrder = !!table.heldOrderCreatedAt
    const isOccupied = table.status === 'OCCUPIED' || hasHeldOrder
    const isReserved = table.status === 'RESERVED'
    const isAvailable = table.status === 'AVAILABLE' && !hasHeldOrder

    const statusConfig = {
        occupied: {
            cardBg: "bg-amber-50",
            border: "border-amber-200",
            pillBg: "bg-amber-500",
            pillIcon: "🔒",
            text: "OCCUPIED",
            bottomBg: "bg-amber-100",
            bottomText: "text-amber-700"
        },
        reserved: {
            cardBg: "bg-blue-50",
            border: "border-blue-200",
            pillBg: "bg-blue-500",
            pillIcon: "📅",
            text: "RESERVED",
            bottomBg: "bg-blue-100",
            bottomText: "text-blue-700"
        },
        available: {
            cardBg: "bg-white",
            border: "border-gray-200",
            pillBg: "bg-green-500",
            pillIcon: "👤",
            text: "AVAILABLE",
            bottomBg: "bg-green-50",
            bottomText: "text-green-600"
        },
        cleaning: {
            cardBg: "bg-purple-50",
            border: "border-purple-200",
            pillBg: "bg-purple-500",
            pillIcon: "🧹",
            text: "CLEANING",
            bottomBg: "bg-purple-100",
            bottomText: "text-purple-700"
        }
    }

    const status = (table.status === 'CLEANING') ? 'cleaning' : isOccupied ? 'occupied' : isReserved ? 'reserved' : 'available'
    const config = statusConfig[status]

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group hover:shadow-xl active:scale-[0.98]",
                config.cardBg, config.border
            )}
        >
            {/* Card Content */}
            <div className="p-4 pb-0">
                <div className="flex justify-between items-start mb-3">
                    {/* Status Pill Badge */}
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm",
                        config.pillBg
                    )}>
                        <span>{config.pillIcon}</span>
                        <span>{config.text}</span>
                    </div>

                    {/* Eye Icon (Settings) */}
                    <button
                        onClick={onSettings}
                        className="p-1.5 rounded-lg bg-white/50 hover:bg-white text-gray-500 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Table Settings"
                    >
                        <Eye className="h-5 w-5" />
                    </button>
                </div>

                {/* Table Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{table.name}</h3>

                {/* Guest/Seat Count or Timer */}
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-2">
                    <Users className="h-4 w-4" />
                    {hasHeldOrder ? (
                        <TableTimer startTime={table.heldOrderCreatedAt!} />
                    ) : (
                        <span>{table.capacity} {isOccupied ? 'Guests' : 'Seats'}</span>
                    )}
                </div>

                {/* Floor Name & Waiter */}
                <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                    <span>{table.floorName || 'Unassigned'}</span>
                    {table.waiter && (
                        <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            🤵 {table.waiter.username}
                        </span>
                    )}
                </div>

                {/* Merged Indicator */}
                {table.mergedWith && (
                    <div className="mb-2 text-xs text-blue-600 font-medium">
                        🔗 Merged with {table.mergedWith.name}
                    </div>
                )}
                {table.subTables && table.subTables.length > 0 && (
                    <div className="mb-2 text-xs text-blue-600 font-medium">
                        🔗 Master Table (+{table.subTables.length})
                    </div>
                )}
            </div>

            {/* Bottom Capacity Indicator */}
            <div className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
                config.bottomBg
            )}>
                <span className="text-green-500">✓</span>
                <span className={config.bottomText}>
                    {isAvailable ? `${table.capacity} Pax` : isOccupied ? `${table.capacity} Seats` : 'Reserved'}
                </span>
            </div>

            {/* Hover Actions (Delete/Vacate) - keeping for quick access if needed, but Eye handles most now */}
            <div className="absolute top-12 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isOccupied && (
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 bg-white hover:bg-green-100 text-green-600 shadow-md"
                        onClick={onVacate}
                        title="Mark as Vacant"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7 shadow-md"
                    onClick={onDelete}
                    disabled={!isOnline || isDeleting}
                    title={!isOnline ? "Offline" : "Delete"}
                >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
            </div>
        </div>
    )
}

// Table Settings Dialog - QR, Reserve, Edit
function TableSettingsDialog({ table, isOpen, onClose, onAction, qrToken, onGenerateQR, qrLoading }: {
    table: Table | null
    isOpen: boolean
    onClose: () => void
    onAction: (action: string) => void
    qrToken: string | null
    onGenerateQR: () => void
    qrLoading: boolean
}) {
    // Tabs state
    const [activeTab, setActiveTab] = useState<'actions' | 'qr'>('actions')

    if (!isOpen || !table) return null

    const isAvailable = table.status === 'AVAILABLE' && !table.heldOrderCreatedAt

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>{table.name}</span>
                        <span className="text-gray-400 font-normal text-sm">• {table.floorName || 'Unassigned'}</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs Header */}
                <div className="flex border-b mb-4">
                    <button
                        onClick={() => setActiveTab('actions')}
                        className={cn("flex-1 pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'actions' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700")}
                    >
                        Actions
                    </button>
                    <button
                        onClick={() => { setActiveTab('qr'); if (!qrToken) onGenerateQR(); }}
                        className={cn("flex-1 pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'qr' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700")}
                    >
                        QR Code
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-[200px]">
                    {activeTab === 'actions' ? (
                        <div className="space-y-3">
                            {/* Reserve Option */}
                            <button
                                onClick={() => onAction('reserve')}
                                disabled={!isAvailable}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group",
                                    isAvailable
                                        ? "bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer"
                                        : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <LockKeyhole className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">Reserve Table</div>
                                        <div className="text-xs text-gray-500">{isAvailable ? 'Mark table as reserved' : 'Table is currently occupied'}</div>
                                    </div>
                                </div>
                                <div className="text-gray-400">›</div>
                            </button>

                            {/* Edit Option */}
                            <button
                                onClick={() => onAction('edit')}
                                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Edit className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">Edit Details</div>
                                        <div className="text-xs text-gray-500">Change name or capacity</div>
                                    </div>
                                </div>
                                <div className="text-gray-400">›</div>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-2 text-center">
                            {qrLoading ? (
                                <Loader2 className="h-12 w-12 animate-spin text-gray-400 my-8" />
                            ) : qrToken ? (
                                <>
                                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 shadow-sm mb-4">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order?token=${qrToken}`)}`}
                                            alt="Table QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            className="flex-1 bg-black text-white hover:bg-gray-800"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order?token=${qrToken}`)}`;
                                                link.download = `QR-${table.name}.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                        >
                                            Download QR
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/order?token=${qrToken}`)
                                                toast.success("Link copied!")
                                            }}
                                        >
                                            Copy Link
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-500 my-8">Failed to load QR code</div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Table Settings Dialog - Advanced Management
function AdvancedTableSettingsDialog({ table, isOpen, onClose, onAction, qrToken, onGenerateQR, qrLoading }: {
    table: Table | null
    isOpen: boolean
    onClose: () => void
    onAction: (action: string) => void
    qrToken: string | null
    onGenerateQR: () => void
    qrLoading: boolean
}) {
    // Tabs state
    const [activeTab, setActiveTab] = useState<'actions' | 'merge' | 'staff' | 'qr'>('actions')

    // Data state
    const [waiters, setWaiters] = useState<{ id: string, username: string, role: string }[]>([])
    const [floorTables, setFloorTables] = useState<Table[]>([])
    const [loadingData, setLoadingData] = useState(false)

    // Form state
    const [s_waiterId, setS_WaiterId] = useState<string>("")
    const [s_mergeIds, setS_MergeIds] = useState<string[]>([])
    const [s_transferId, setS_TransferId] = useState<string>("")

    // Effects for fetching data
    useEffect(() => {
        if (!isOpen || !table) return

        if (activeTab === 'staff') {
            setLoadingData(true)
            getWaiters().then(data => {
                setWaiters(data)
                setLoadingData(false)
                if (table.waiter) setS_WaiterId(table.waiter.id)
            })
        }

        if (activeTab === 'merge' || activeTab === 'actions') {
            if (table.floorId) {
                // Fetch tables for current floor to merge/transfer
                getTablesForFloor(table.floorId).then(data => {
                    setFloorTables(data as Table[])
                })
            }
        }
    }, [isOpen, activeTab, table])

    if (!isOpen || !table) return null

    const isAvailable = table.status === 'AVAILABLE' && !table.heldOrderCreatedAt
    const isOccupied = table.status === 'OCCUPIED' || !!table.heldOrderCreatedAt
    const isCleaning = table.status === 'CLEANING'

    // Handlers
    const handleAssignWaiter = async () => {
        await assignWaiter(table.id, s_waiterId || null)
        toast.success("Waiter updated!")
        setS_WaiterId("")
        onClose()
    }

    const handleMerge = async () => {
        if (s_mergeIds.length === 0) return
        await mergeTables(table.id, s_mergeIds)
        toast.success("Tables merged successfully!")
        onClose()
    }

    const handleUnmerge = async () => {
        await unmergeTable(table.id)
        toast.success("Table unmerged!")
        onClose()
    }

    const handleTransfer = async () => {
        if (!s_transferId) return
        await transferTable(table.id, s_transferId)
        toast.success("Transfer successful!")
        onClose()
    }

    const toggleCleaning = async () => {
        const newStatus = isCleaning ? 'AVAILABLE' : 'CLEANING'
        await updateTableStatus(table.id, newStatus)
        toast.success(`Table marked as ${newStatus}`)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>{table.name}</span>
                        <span className="text-gray-400 font-normal text-sm">• {table.floorName || 'Unassigned'}</span>
                        {table.status === 'CLEANING' && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">Cleaning</span>}
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs Header */}
                <div className="flex border-b mb-4 overflow-x-auto">
                    {[
                        { id: 'actions', label: 'Actions', icon: LayoutGrid },
                        { id: 'staff', label: 'Staff', icon: Users },
                        { id: 'merge', label: 'Merge', icon: ArrowRightLeft }, // Using arrow for merge/split metaphor
                        { id: 'qr', label: 'QR', icon: QrCode },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); if (tab.id === 'qr' && !qrToken) onGenerateQR(); }}
                            className={cn(
                                "flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1 min-w-[60px]",
                                activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="min-h-[250px]">
                    {activeTab === 'actions' && (
                        <div className="space-y-2">
                            {/* Cleaning Toggle */}
                            <button
                                onClick={toggleCleaning}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                    isCleaning ? "bg-green-50 border-green-200 hover:bg-green-100 text-green-700" : "bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center text-current">
                                        <RotateCcw className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold">{isCleaning ? 'Mark Available' : 'Mark Cleaning'}</span>
                                </div>
                            </button>

                            {/* Transfer (Only if occupied/held) */}
                            {isOccupied && (
                                <div className="p-3 border rounded-xl bg-gray-50 transition-all hover:bg-gray-100">
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">Transfer To Table</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 rounded-md border text-sm p-2 bg-white"
                                            value={s_transferId}
                                            onChange={(e) => setS_TransferId(e.target.value)}
                                        >
                                            <option value="">Select Target...</option>
                                            {floorTables.filter(t => t.id !== table.id && !t.heldOrderId && t.status === 'AVAILABLE').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <Button size="sm" onClick={handleTransfer} disabled={!s_transferId}>Move</Button>
                                    </div>
                                </div>
                            )}

                            {/* Reserve Option */}
                            <button
                                onClick={() => onAction('reserve')}
                                disabled={!isAvailable}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                    isAvailable
                                        ? "bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer"
                                        : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <LockKeyhole className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">Reserve</div>
                                        <div className="text-xs text-gray-500">{isAvailable ? 'Block this table' : 'Currently unavailable'}</div>
                                    </div>
                                </div>
                            </button>

                            {/* Edit Option */}
                            <button
                                onClick={() => onAction('edit')}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                                        <Edit className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">Edit Details</div>
                                        <div className="text-xs text-gray-500">Name & Capacity</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {activeTab === 'merge' && (
                        <div className="space-y-4 pt-2">
                            {(table.mergedWith || (table.subTables && table.subTables.length > 0)) ? (
                                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-sm text-blue-800 font-medium mb-3">
                                        {table.mergedWith ? `Merged with ${table.mergedWith.name}` : `Master of ${table.subTables?.length} tables`}
                                    </p>
                                    <Button variant="destructive" size="sm" onClick={handleUnmerge}>
                                        Unmerge / Split
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs text-gray-500 mb-2">Select tables to merge with {table.name}:</div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                                        {floorTables.filter(t => t.id !== table.id && !t.mergedWith && (!t.subTables || t.subTables.length === 0) && t.status === 'AVAILABLE').map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => {
                                                    setS_MergeIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])
                                                }}
                                                className={cn(
                                                    "p-2 border rounded-lg cursor-pointer text-sm transition-colors",
                                                    s_mergeIds.includes(t.id) ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="font-bold">{t.name}</div>
                                                <div className="text-xs text-gray-500">{t.capacity} Pax</div>
                                            </div>
                                        ))}
                                        {floorTables.length === 0 && <span className="text-xs text-gray-400 col-span-2 text-center py-4">No other tables available</span>}
                                    </div>
                                    <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700" disabled={s_mergeIds.length === 0} onClick={handleMerge}>
                                        Merge Selected ({s_mergeIds.length})
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assigned Waiter/Captain</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-white"
                                    value={s_waiterId}
                                    onChange={(e) => setS_WaiterId(e.target.value)}
                                >
                                    <option value="">-- No Waiter Assigned --</option>
                                    {waiters.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <Button className="w-full" onClick={handleAssignWaiter}>Save Assignment</Button>
                        </div>
                    )}

                    {activeTab === 'qr' && (
                        <div className="flex flex-col items-center py-2 text-center">
                            {qrLoading ? (
                                <Loader2 className="h-12 w-12 animate-spin text-gray-400 my-8" />
                            ) : qrToken ? (
                                <>
                                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 shadow-sm mb-4">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order?token=${qrToken}`)}`}
                                            alt="Table QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            className="flex-1 bg-black text-white hover:bg-gray-800"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order?token=${qrToken}`)}`;
                                                link.download = `QR-${table.name}.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                        >
                                            Download QR
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/order?token=${qrToken}`)
                                                toast.success("Link copied!")
                                            }}
                                        >
                                            Copy Link
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-500 my-8">Failed to load QR code</div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ========== MAIN COMPONENT ==========
interface TablesClientProps {
    initialTables: Table[]
    userRole?: string
}

export default function TablesClient({ initialTables, userRole }: TablesClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const isOnline = useNetworkStatus()

    // Data State
    const [floors, setFloors] = useState<FloorStats[]>([])
    const [unassignedStats, setUnassignedStats] = useState({ totalTables: 0, occupiedCount: 0, availableCount: 0, reservedCount: 0 })
    const [tables, setTables] = useState<Table[]>(initialTables)
    const [loading, setLoading] = useState(false)

    // UI State
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null) // null until floors load
    const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'available' | 'reserved'>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedTable, setSelectedTable] = useState<Table | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newTableName, setNewTableName] = useState("")
    const [newTableCapacity, setNewTableCapacity] = useState(4)
    const [adding, setAdding] = useState(false)
    const [addTableError, setAddTableError] = useState("")
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [vacatingId, setVacatingId] = useState<string | null>(null)

    // QR Dialog State
    const [qrDialogOpen, setQrDialogOpen] = useState(false)
    const [qrToken, setQrToken] = useState<string | null>(null)
    const [qrLoading, setQrLoading] = useState(false)

    // Floor Dialog State
    const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
    const [newFloorName, setNewFloorName] = useState("")
    const [creatingFloor, setCreatingFloor] = useState(false)

    // Edit Floor Dialog State
    const [isEditFloorOpen, setIsEditFloorOpen] = useState(false)
    const [editingFloor, setEditingFloor] = useState<FloorStats & { id: string } | null>(null)
    const [editFloorName, setEditFloorName] = useState("")
    const [updatingFloor, setUpdatingFloor] = useState(false)

    // Delete Floor Confirmation State
    const [isDeleteFloorOpen, setIsDeleteFloorOpen] = useState(false)
    const [floorToDelete, setFloorToDelete] = useState<FloorStats & { id: string } | null>(null)
    const [deletingFloor, setDeletingFloor] = useState(false)

    // Role
    const [effectiveRole, setEffectiveRole] = useState(userRole)
    const isAdmin = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'].includes(effectiveRole || '')
    const [showInfo, setShowInfo] = useState(false)

    // Refresh Debounce Ref
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // ========== DATA LOADING ==========

    // Load Floors on Mount
    useEffect(() => {
        // Check if user has visited before
        const hasVisited = localStorage.getItem('hasVisitedTables')
        if (!hasVisited) {
            setShowInfo(true)
            localStorage.setItem('hasVisitedTables', 'true')
        } else {
            setShowInfo(false)
        }

        const loadFloors = async () => {
            if (!isOnline) return
            try {
                const data = await getFloorsWithTables()
                const floorsData = data.floors || []
                setFloors(floorsData)
                setUnassignedStats(data.unassigned || { totalTables: 0, occupiedCount: 0, availableCount: 0, reservedCount: 0 })

                // Auto-select first floor if not already selected
                if (!selectedFloorId && floorsData.length > 0) {
                    setSelectedFloorId(floorsData[0].id)
                } else if (!selectedFloorId && data.unassigned?.totalTables > 0) {
                    setSelectedFloorId('unassigned')
                }
            } catch (e) {
                console.error("Failed to load floors", e)
            }
        }
        loadFloors()
    }, [isOnline, selectedFloorId])

    // Load Tables for Selected Floor
    useEffect(() => {
        const loadTables = async () => {
            setLoading(true)
            try {
                const floorId = selectedFloorId === 'all' ? 'all' : selectedFloorId === 'unassigned' ? null : selectedFloorId
                const data = await getTablesForFloor(floorId)
                setTables(data as Table[])
            } catch (e) {
                console.error("Failed to load tables", e)
            } finally {
                setLoading(false)
            }
        }
        if (isOnline) {
            loadTables()
        }
    }, [selectedFloorId, isOnline])

    // Refresh on Events (Debounced)
    useEffect(() => {
        const handleRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
            }
            refreshTimeoutRef.current = setTimeout(async () => {
                if (isOnline) {
                    const floorId = selectedFloorId === 'all' ? 'all' : selectedFloorId === 'unassigned' ? null : selectedFloorId
                    const [floorsData, tablesData] = await Promise.all([
                        getFloorsWithTables(),
                        getTablesForFloor(floorId)
                    ])
                    setFloors(floorsData.floors || [])
                    setUnassignedStats(floorsData.unassigned || { totalTables: 0, occupiedCount: 0, availableCount: 0, reservedCount: 0 })
                    setTables(tablesData as Table[])
                }
            }, 1000)
        }

        window.addEventListener('tableUpdated', handleRefresh)
        window.addEventListener('holdOrderUpdated', handleRefresh)
        return () => {
            window.removeEventListener('tableUpdated', handleRefresh)
            window.removeEventListener('holdOrderUpdated', handleRefresh)
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
        }
    }, [isOnline, selectedFloorId])

    // ========== COMPUTED VALUES ==========

    const filteredTables = tables.filter(t => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'occupied') return t.status === 'OCCUPIED' || !!t.heldOrderCreatedAt
        if (statusFilter === 'available') return t.status === 'AVAILABLE' && !t.heldOrderCreatedAt
        if (statusFilter === 'reserved') return t.status === 'RESERVED'
        return true
    })

    const allStats = {
        total: tables.length,
        occupied: tables.filter(t => t.status === 'OCCUPIED' || !!t.heldOrderCreatedAt).length,
        available: tables.filter(t => t.status === 'AVAILABLE' && !t.heldOrderCreatedAt).length,
        reserved: tables.filter(t => t.status === 'RESERVED').length
    }

    const currentFloorName = selectedFloorId === 'all'
        ? 'All Floors'
        : selectedFloorId === 'unassigned'
            ? 'Unassigned'
            : floors.find(f => f.id === selectedFloorId)?.name || 'Unknown'

    // ========== HANDLERS ==========

    const handleNameChange = (name: string) => {
        setNewTableName(name)
        setAddTableError("")

        const tableName = name.trim()
        if (!tableName) return

        // Real-time duplicate check (scoped to this floor)
        const floorIdToCheck = selectedFloorId === 'unassigned' ? undefined : selectedFloorId

        const exists = tables.some(t => {
            // If creating for specific floor, only check tables on that floor
            if (floorIdToCheck) {
                return t.floorId === floorIdToCheck && t.name.toLowerCase() === tableName.toLowerCase()
            }
            // If creating unassigned, check unassigned tables
            // Note: If selectedFloorId is null/all, we might be in 'all' view which shouldn't happen for adding
            // but if so, we're strict about it.
            return !t.floorId && t.name.toLowerCase() === tableName.toLowerCase()
        })

        if (exists) {
            setAddTableError(`Table "${tableName}" already exists on this floor`)
        }
    }

    const handleAddTable = async () => {
        // Validation
        const tableName = newTableName.trim()
        if (!tableName) {
            setAddTableError("Table name is required")
            return
        }
        if (tableName.length < 2) {
            setAddTableError("Table name must be at least 2 characters")
            return
        }
        if (newTableCapacity < 1 || newTableCapacity > 100) {
            setAddTableError("Capacity must be between 1 and 100")
            return
        }

        // Final duplicate check (scoped)
        const floorIdToCheck = selectedFloorId === 'unassigned' ? undefined : selectedFloorId
        const exists = tables.some(t => {
            if (floorIdToCheck) {
                return t.floorId === floorIdToCheck && t.name.toLowerCase() === tableName.toLowerCase()
            }
            return !t.floorId && t.name.toLowerCase() === tableName.toLowerCase()
        })

        if (exists) {
            setAddTableError(`Table "${tableName}" already exists on this floor`)
            return
        }

        setAdding(true)
        setAddTableError("")
        try {
            // Auto-assign to selected floor (if it's a valid floor ID, not 'all' or 'unassigned')
            const floorId = selectedFloorId && selectedFloorId !== 'all' && selectedFloorId !== 'unassigned'
                ? selectedFloorId
                : undefined

            const newTable = await addTable(tableName, newTableCapacity, floorId)

            // Fix: Manually add floorName to the new table object for immediate UI update
            const floorName = floorId ? floors.find(f => f.id === floorId)?.name : null
            const optimisitcTable = { ...newTable, floorName }

            setTables(prev => [...prev, optimisitcTable as any])
            setNewTableName("")
            setNewTableCapacity(4)
            setIsAddOpen(false)
            toast.success(`${tableName} created successfully`)

            // Refresh floors and tables
            const data = await getFloorsWithTables()
            setFloors(data.floors || [])
            setUnassignedStats(data.unassigned || { totalTables: 0, occupiedCount: 0, availableCount: 0, reservedCount: 0 })
        } catch (error: any) {
            setAddTableError(error.message || "Failed to create table")
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
                // Refresh floors
                const data = await getFloorsWithTables()
                setFloors(data.floors || [])
            } finally {
                setDeletingId(null)
            }
        }
    }

    const handleVacate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setVacatingId(id)
        try {
            await updateTableStatus(id, 'AVAILABLE')
            setTables(prev => prev.map(t => t.id === id ? { ...t, status: 'AVAILABLE' as const, heldOrderCreatedAt: null, heldOrderId: null } : t))
            toast.success("Table marked as available")
            // Refresh floors
            const data = await getFloorsWithTables()
            setFloors(data.floors || [])
        } catch (error) {
            toast.error("Failed to update table")
        } finally {
            setVacatingId(null)
        }
    }

    const handleCardClick = (table: Table) => {
        // Direct Navigation Logic
        if (table.heldOrderId) {
            // Resume held order
            router.push(`/dashboard/new-order?resumeOrderId=${table.heldOrderId}&tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
        } else {
            // New order
            router.push(`/dashboard/new-order?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
        }
    }

    const handleSettingsClick = (e: React.MouseEvent, table: Table) => {
        e.stopPropagation() // Prevent card click
        setSelectedTable(table)
        setIsDrawerOpen(true) // Reusing isDrawerOpen state for the new Dialog
    }

    const handleDrawerAction = async (action: string) => {
        if (!selectedTable) return
        setIsDrawerOpen(false)

        switch (action) {
            case 'order':
            case 'add':
                router.push(`/dashboard/new-order?tableId=${selectedTable.id}&tableName=${encodeURIComponent(selectedTable.name)}`)
                break
            case 'view':
                if (selectedTable.heldOrderId) {
                    router.push(`/dashboard/new-order?resumeOrderId=${selectedTable.heldOrderId}&tableId=${selectedTable.id}&tableName=${encodeURIComponent(selectedTable.name)}`)
                }
                break
            case 'vacant':
                await handleVacate({ stopPropagation: () => { } } as any, selectedTable.id)
                break
            case 'reserve':
                await updateTableStatus(selectedTable.id, 'RESERVED')
                setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: 'RESERVED' as const } : t))
                toast.success("Table reserved")
                break
            case 'qr':
                setQrLoading(true)
                setQrDialogOpen(true)
                try {
                    const token = await getTableQRToken(selectedTable.id)
                    setQrToken(token)
                } catch (e) {
                    toast.error("Failed to generate QR code")
                } finally {
                    setQrLoading(false)
                }
                break
            case 'transfer':
                toast.info("Transfer feature coming soon!")
                break
            case 'edit':
                toast.info("Edit feature coming soon!")
                break
        }
    }

    // ========== RENDER ==========
    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
                    <p className="text-gray-500 text-sm">Manage floor plan and track occupancy</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'grid' && "bg-white shadow-sm")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'list' && "bg-white shadow-sm")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Info Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 hover:bg-blue-50 hover:text-blue-600", showInfo && "bg-blue-50 text-blue-600")}
                        onClick={() => setShowInfo(!showInfo)}
                        title="Toggle Guide"
                    >
                        <Info className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Informative Section */}
            {showInfo && isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => setShowInfo(false)}
                        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Info className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <h3 className="font-semibold text-blue-900">Floor & Table Management Guide</h3>
                                <p className="text-sm text-blue-700">Easily manage your restaurant layout with these features:</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-blue-800">
                                <div className="flex items-start gap-2">
                                    <span className="font-bold bg-blue-200 text-blue-700 px-1.5 rounded text-xs mt-0.5">1</span>
                                    <span><strong>Create Floors:</strong> Use the <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs mx-1"><Plus className="h-3 w-3 mr-1" />Add Floor</span> button to create areas like "Terrace".</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold bg-blue-200 text-blue-700 px-1.5 rounded text-xs mt-0.5">2</span>
                                    <span><strong>Add Tables:</strong> Select a floor, then click the <span className="font-semibold text-orange-600 dashed border-b border-orange-400">Add Table</span> card in the grid.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold bg-blue-200 text-blue-700 px-1.5 rounded text-xs mt-0.5">3</span>
                                    <span><strong>Edit/Delete:</strong> Hover over any floor tab to see <Edit className="h-3 w-3 inline mx-1 text-blue-600" /> Edit and <Trash2 className="h-3 w-3 inline mx-1 text-red-600" /> Delete buttons.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold bg-blue-200 text-blue-700 px-1.5 rounded text-xs mt-0.5">4</span>
                                    <span><strong>Status:</strong> <span className="text-green-600 font-bold">● Green</span> is Available, <span className="text-amber-600 font-bold">● Amber</span> is Occupied.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floor Tabs */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {/* Floor Tabs - Show individual floors */}
                {floors.map((floor, idx) => (
                    <FloorTab
                        key={floor.id}
                        floor={floor}
                        isActive={selectedFloorId === floor.id}
                        onClick={() => setSelectedFloorId(floor.id)}
                        index={idx}
                        onEdit={(f) => {
                            setEditingFloor(f);
                            setEditFloorName(f.name);
                            setIsEditFloorOpen(true);
                        }}
                        onDelete={(f) => {
                            setFloorToDelete(f);
                            setIsDeleteFloorOpen(true);
                        }}
                    />
                ))}

                {/* Unassigned Tab (if any) */}
                {unassignedStats.totalTables > 0 && (
                    <button
                        onClick={() => setSelectedFloorId('unassigned')}
                        className={cn(
                            "flex-shrink-0 px-5 py-3 rounded-xl border-2 border-dashed transition-all text-left min-w-[150px]",
                            selectedFloorId === 'unassigned'
                                ? "bg-gray-100 border-gray-400 shadow-sm"
                                : "bg-gray-50 border-gray-300 hover:border-gray-400 hover:shadow-sm"
                        )}
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <span>📦</span>
                            <span className="font-bold text-sm text-gray-600">Unassigned</span>
                        </div>
                        <div className="text-xs text-gray-500">{unassignedStats.totalTables} Tables</div>
                    </button>
                )}

                {/* Add Floor Button - inline in floor tabs */}
                <button
                    onClick={() => setIsFloorDialogOpen(true)}
                    className="flex-shrink-0 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center justify-center min-w-[100px]"
                    title="Add new floor"
                >
                    <Plus className="h-5 w-5 text-gray-400" />
                    <span className="ml-1 text-sm text-gray-500">Add Floor</span>
                </button>
            </div>

            {/* Create Floor Dialog */}
            <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Floor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Floor Name</label>
                            <Input
                                value={newFloorName}
                                onChange={(e) => setNewFloorName(e.target.value)}
                                placeholder="e.g. Ground Floor"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 w-full">Quick Add:</span>
                            {['Ground Floor', 'First Floor', 'Second Floor', 'Outdoor', 'Terrace', 'Garden'].map(name => (
                                <Button
                                    key={name}
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        setCreatingFloor(true)
                                        try {
                                            await createFloor(name)
                                            const data = await getFloorsWithTables()
                                            setFloors(data.floors || [])
                                            if (data.floors?.length > 0) {
                                                setSelectedFloorId(data.floors[0].id)
                                            }
                                            toast.success(`${name} created!`)
                                            setIsFloorDialogOpen(false)
                                        } catch (e: any) {
                                            toast.error(e.message || 'Failed to create floor')
                                        } finally {
                                            setCreatingFloor(false)
                                        }
                                    }}
                                    disabled={creatingFloor}
                                >
                                    {name}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFloorDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!newFloorName.trim()) return
                                setCreatingFloor(true)
                                try {
                                    await createFloor(newFloorName.trim())
                                    const data = await getFloorsWithTables()
                                    setFloors(data.floors || [])
                                    if (data.floors?.length > 0) {
                                        setSelectedFloorId(data.floors[0].id)
                                    }
                                    setNewFloorName('')
                                    setIsFloorDialogOpen(false)
                                    toast.success('Floor created!')
                                } catch (e: any) {
                                    toast.error(e.message || 'Failed to create floor')
                                } finally {
                                    setCreatingFloor(false)
                                }
                            }}
                            className="bg-orange-600 text-white"
                            disabled={creatingFloor || !newFloorName.trim()}
                        >
                            {creatingFloor ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap justify-center">
                <StatusPill label="All Tables" count={allStats.total} isActive={statusFilter === 'all'} color="all" onClick={() => setStatusFilter('all')} />
                <StatusPill label="Occupied" count={allStats.occupied} isActive={statusFilter === 'occupied'} color="occupied" onClick={() => setStatusFilter('occupied')} />
                <StatusPill label="Available" count={allStats.available} isActive={statusFilter === 'available'} color="available" onClick={() => setStatusFilter('available')} />
                {allStats.reserved > 0 && (
                    <StatusPill label="Reserved" count={allStats.reserved} isActive={statusFilter === 'reserved'} color="reserved" onClick={() => setStatusFilter('reserved')} />
                )}
            </div>

            {/* Context Header (Filtered View) */}
            {/* Context Header */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h2 className="font-bold text-gray-900">
                    {statusFilter === 'all' ? 'All Tables' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' Tables'} — {currentFloorName}
                </h2>
                <p className="text-sm text-gray-500">
                    {filteredTables.length} Tables {statusFilter === 'all' ? 'Total' : `Currently ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
                </p>
            </div>

            {/* Table Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Users className="h-12 w-12 mb-2" />
                    <p className="text-lg">No tables found</p>
                    {/* Add First Table button when floor is selected */}
                    {isAdmin && selectedFloorId && selectedFloorId !== 'all' && selectedFloorId !== 'unassigned' && (
                        <button
                            onClick={() => { setAddTableError(""); setIsAddOpen(true); }}
                            disabled={!isOnline}
                            className="px-6 py-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 transition-all flex items-center gap-3"
                        >
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <Plus className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-orange-700">Add First Table</div>
                                <div className="text-xs text-orange-500">to {currentFloorName}</div>
                            </div>
                        </button>
                    )}
                </div>
            ) : (
                <div className={cn(
                    "flex-1 overflow-y-auto",
                    viewMode === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start"
                        : "space-y-2"
                )}>
                    {filteredTables.map(table => (
                        viewMode === 'grid' ? (
                            <TableCard
                                key={table.id}
                                table={table}
                                onClick={() => handleCardClick(table)}
                                onSettings={(e) => handleSettingsClick(e, table)}
                                onVacate={(e) => handleVacate(e, table.id)}
                                onDelete={(e) => handleDelete(e, table.id)}
                                isDeleting={deletingId === table.id}
                                isOnline={isOnline}
                            />
                        ) : (
                            <div
                                key={table.id}
                                onClick={() => handleCardClick(table)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all",
                                    table.status === 'OCCUPIED' || table.heldOrderCreatedAt
                                        ? "bg-amber-50 border-amber-200"
                                        : table.status === 'RESERVED'
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-green-50 border-green-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-3 w-3 rounded-full",
                                        table.status === 'OCCUPIED' || table.heldOrderCreatedAt
                                            ? "bg-amber-500"
                                            : table.status === 'RESERVED'
                                                ? "bg-blue-500"
                                                : "bg-green-500"
                                    )} />
                                    <div>
                                        <span className="font-bold text-gray-900">{table.name}</span>
                                        <span className="text-gray-500 ml-2">👥 {table.capacity}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {table.heldOrderCreatedAt && <TableTimer startTime={table.heldOrderCreatedAt} />}
                                    <span className="text-gray-400">›</span>
                                </div>
                            </div>
                        )
                    ))}

                    {/* Add Table Card - Shows in grid when a floor is selected */}
                    {isAdmin && selectedFloorId && selectedFloorId !== 'all' && selectedFloorId !== 'unassigned' && viewMode === 'grid' && (
                        <button
                            onClick={() => { setAddTableError(""); setIsAddOpen(true); }}
                            disabled={!isOnline}
                            className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-400 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] gap-2 group"
                        >
                            <div className="h-12 w-12 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                                <Plus className="h-6 w-6 text-orange-600" />
                            </div>
                            <span className="font-semibold text-orange-700">Add Table</span>
                            <span className="text-xs text-orange-500">to {currentFloorName}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Legend - Bottom Right with Shadow */}
            <div className="flex justify-end pt-2">
                <div className="flex items-center gap-4 text-xs font-medium text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-green-100" /> Available</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" /> Occupied</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" /> Reserved</div>
                </div>
            </div>

            {/* Settings Dialog (Replaces QuickActionsDrawer) */}
            <AdvancedTableSettingsDialog
                table={selectedTable}
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setQrToken(null); }}
                onAction={handleDrawerAction}
                qrToken={qrToken}
                onGenerateQR={async () => {
                    if (!selectedTable) return
                    setQrLoading(true)
                    try {
                        const token = await getTableQRToken(selectedTable.id)
                        setQrToken(token)
                    } catch (e) {
                        toast.error("Failed to generate QR code")
                    } finally {
                        setQrLoading(false)
                    }
                }}
                qrLoading={qrLoading}
            />

            {/* QR Code Dialog */}
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>QR Code — {selectedTable?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6">
                        {qrLoading ? (
                            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                        ) : qrToken ? (
                            <>
                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order?token=${qrToken}`)}`}
                                        alt="Table QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-4">Scan to order from this table</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/order?token=${qrToken}`)
                                        toast.success("Link copied!")
                                    }}
                                >
                                    Copy Link
                                </Button>
                            </>
                        ) : (
                            <p className="text-gray-500">Failed to generate QR code</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Table Dialog */}
            <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setAddTableError(""); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Table to {currentFloorName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Error Display */}
                        {addTableError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                ⚠️ {addTableError}
                            </div>
                        )}

                        {/* Table Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Table Name <span className="text-red-500">*</span></label>
                            <Input
                                value={newTableName}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. Table 1, VIP Booth, Window Seat"
                                className={cn("text-lg", addTableError.includes("already exists") && "border-red-300 focus-visible:ring-red-300 bg-red-50")}
                            />
                            <p className="text-xs text-gray-500">Name must be unique on this floor</p>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Number of Pax (Capacity) <span className="text-red-500">*</span></label>
                            <div className="flex items-center justify-center gap-3">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setNewTableCapacity(Math.max(1, newTableCapacity - 1))}
                                    className="h-10 w-10 shrink-0"
                                >
                                    -
                                </Button>
                                <div className="text-center w-24">
                                    <span className="text-3xl font-bold">{newTableCapacity}</span>
                                    <span className="text-gray-500 ml-2">pax</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setNewTableCapacity(Math.min(100, newTableCapacity + 1))}
                                    className="h-10 w-10 shrink-0"
                                >
                                    +
                                </Button>
                            </div>
                            <div className="flex justify-center gap-2 mt-2">
                                {[2, 4, 6, 8, 10, 12].map(num => (
                                    <Button
                                        key={num}
                                        variant={newTableCapacity === num ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewTableCapacity(num)}
                                        className="min-w-[40px]"
                                    >
                                        {num}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="text-sm text-green-700 font-medium mb-1">Preview</div>
                            <div className="font-bold text-gray-900">{newTableName || 'Table Name'}</div>
                            <div className="text-sm text-gray-600">{currentFloorName} • {newTableCapacity} Pax</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddTable}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={adding || !newTableName.trim()}
                        >
                            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {adding ? 'Creating...' : 'Create Table'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Floor Dialog */}
            <Dialog open={isEditFloorOpen} onOpenChange={setIsEditFloorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Floor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Floor Name</label>
                            <Input
                                value={editFloorName}
                                onChange={(e) => setEditFloorName(e.target.value)}
                                placeholder="e.g. Ground Floor"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditFloorOpen(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!editingFloor || !editFloorName.trim()) return
                                setUpdatingFloor(true)
                                try {
                                    await updateFloor(editingFloor.id, editFloorName.trim())
                                    const data = await getFloorsWithTables()
                                    setFloors(data.floors || [])
                                    setIsEditFloorOpen(false)
                                    toast.success('Floor updated!')
                                } catch (e: any) {
                                    toast.error(e.message || 'Failed to update floor')
                                } finally {
                                    setUpdatingFloor(false)
                                }
                            }}
                            className="bg-blue-600 text-white"
                            disabled={updatingFloor || !editFloorName.trim()}
                        >
                            {updatingFloor ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Floor Confirmation Dialog */}
            <Dialog open={isDeleteFloorOpen} onOpenChange={setIsDeleteFloorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Floor</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-700 font-medium">⚠️ Warning: This action cannot be undone!</p>
                            <p className="text-red-600 text-sm mt-2">
                                Deleting <strong>{floorToDelete?.name}</strong> will also delete all
                                <strong className="text-red-700"> {floorToDelete?.totalTables} table(s)</strong> on this floor.
                            </p>
                        </div>
                        <p className="text-gray-600">Are you sure you want to delete this floor and all its tables?</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteFloorOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!floorToDelete) return
                                setDeletingFloor(true)
                                try {
                                    await deleteFloor(floorToDelete.id)
                                    const data = await getFloorsWithTables()
                                    setFloors(data.floors || [])
                                    setUnassignedStats(data.unassigned || { totalTables: 0, occupiedCount: 0, availableCount: 0, reservedCount: 0 })

                                    // Select first remaining floor or unassigned
                                    if (data.floors?.length > 0) {
                                        setSelectedFloorId(data.floors[0].id)
                                    } else if (data.unassigned?.totalTables > 0) {
                                        setSelectedFloorId('unassigned')
                                    } else {
                                        setSelectedFloorId(null)
                                    }

                                    setIsDeleteFloorOpen(false)
                                    toast.success(`${floorToDelete.name} and ${floorToDelete.totalTables} table(s) deleted`)
                                } catch (e: any) {
                                    toast.error(e.message || 'Failed to delete floor')
                                } finally {
                                    setDeletingFloor(false)
                                }
                            }}
                            disabled={deletingFloor}
                        >
                            {deletingFloor ? <Loader2 className="h-4 w-4 animate-spin" /> : `Delete Floor & ${floorToDelete?.totalTables || 0} Tables`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
