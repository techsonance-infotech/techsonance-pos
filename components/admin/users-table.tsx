'use client'

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, ShieldAlert, Settings, User, Edit, Trash2, Key, Plus, Loader2, CheckCircle } from "lucide-react"
import { deleteUser, approveUser } from "@/app/actions/admin-users"
import { lockUser, blockIP } from "@/app/actions/security"
import { UserPermissionDialog } from "./user-permission-dialog"
import { StaffModal } from "./staff-modal"
import { StaffDetailModal } from "./staff-detail-modal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function UsersTable({ users, stores }: { users: any[], stores?: any[] }) {
    const router = useRouter()

    // Permission Dialog State
    const [permUser, setPermUser] = useState<any>(null)
    const [permOpen, setPermOpen] = useState(false)

    // Staff Modal State (Create/Edit)
    const [staffModalOpen, setStaffModalOpen] = useState(false)
    const [staffModalMode, setStaffModalMode] = useState<'create' | 'edit'>('create')
    const [selectedStaff, setSelectedStaff] = useState<any>(null)

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [detailUser, setDetailUser] = useState<any>(null)

    // Loading states
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [lockingId, setLockingId] = useState<string | null>(null)

    // Handle Create
    const handleCreate = () => {
        setSelectedStaff(null)
        setStaffModalMode('create')
        setStaffModalOpen(true)
    }

    // Handle Edit
    const handleEdit = (user: any) => {
        setSelectedStaff(user)
        setStaffModalMode('edit')
        setStaffModalOpen(true)
    }

    // Handle Row Click - Show Details
    const handleRowClick = (user: any) => {
        setDetailUser(user)
        setDetailModalOpen(true)
    }

    // Handle Edit from Detail Modal
    const handleEditFromDetail = () => {
        setDetailModalOpen(false)
        setSelectedStaff(detailUser)
        setStaffModalMode('edit')
        setStaffModalOpen(true)
    }

    const handleLock = async (userId: string, currentLock: boolean) => {
        const result = await lockUser(userId, !currentLock)
        if (result.success) {
            toast.success(currentLock ? "User Unlocked" : "User Locked")
            router.refresh()
        } else {
            toast.error("Action failed")
        }
    }

    const handleBlockIP = async (ip: string) => {
        if (!ip) return
        if (!confirm(`Are you sure you want to block IP: ${ip}?`)) return
        const result = await blockIP(ip, "Blocked from User List")
        if (result.success) {
            toast.success("IP Blocked")
        } else {
            toast.error(result.error)
        }
    }

    const openPermissions = (user: any, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row click
        setPermUser(user)
        setPermOpen(true)
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'BUSINESS_OWNER':
                return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'MANAGER':
                return 'bg-green-100 text-green-700 border-green-200'
            case 'CASHIER':
                return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'USER':
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <div className="rounded-2xl bg-white shadow-xl overflow-hidden ring-1 ring-gray-100">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-700">All Users</h3>
                <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Create Staff
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-100">
                            <TableHead className="font-semibold text-gray-700 py-4">User</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Email</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Role</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Last IP</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Status</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700 py-4">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user, index) => (
                            <TableRow
                                key={user.id}
                                onClick={() => handleRowClick(user)}
                                className={cn(
                                    "hover:bg-gray-50/50 transition-colors cursor-pointer",
                                    index !== users.length - 1 && "border-b border-gray-50"
                                )}
                            >
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold shadow-sm">
                                            {user.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{user.username}</p>
                                            <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <span className="text-gray-700">{user.email}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "font-medium border",
                                            getRoleBadgeColor(user.role)
                                        )}
                                    >
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                        <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700 border border-gray-200">
                                            {user.lastIp || "N/A"}
                                        </code>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    {user.isLocked ? (
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border border-red-200 flex w-fit items-center gap-1.5">
                                            <Lock className="h-3 w-3" /> Disabled
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-200 flex w-fit items-center gap-1.5">
                                            <User className="h-3 w-3" /> Active
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Edit Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Edit User Details"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(user)
                                            }}
                                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Manage Permissions & Stores"
                                            onClick={(e) => openPermissions(user, e)}
                                            className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                        >
                                            <Key className="h-4 w-4" />
                                        </Button>

                                        {/* Approve Button for Unverified Users */}
                                        {(!user.isVerified || !user.isApproved) && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Approve & Verify User"
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (!confirm("Approve this user? This will verify their email and enable login.")) return
                                                    const result = await approveUser(user.id)
                                                    if (result.success) {
                                                        toast.success("User approved and verified")
                                                    } else {
                                                        toast.error("Failed to approve user")
                                                    }
                                                }}
                                                className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* Block IP Button */}
                                        {user.lastIp && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Block this IP"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleBlockIP(user.lastIp)
                                                }}
                                                className="h-9 w-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all"
                                            >
                                                <ShieldAlert className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Permission Dialog */}
            {permUser && (
                <UserPermissionDialog
                    user={permUser}
                    stores={stores || []}
                    open={permOpen}
                    onOpenChange={(open) => {
                        setPermOpen(open)
                        if (!open) setPermUser(null)
                    }}
                />
            )}

            {/* Staff Create/Edit Modal */}
            <StaffModal
                isOpen={staffModalOpen}
                onClose={() => {
                    setStaffModalOpen(false)
                    setSelectedStaff(null)
                }}
                mode={staffModalMode}
                user={selectedStaff}
                stores={stores}
                onSuccess={() => router.refresh()}
            />

            {/* Staff Detail Modal */}
            <StaffDetailModal
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false)
                    setDetailUser(null)
                }}
                user={detailUser}
                onEdit={handleEditFromDetail}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </div>
    )
}
