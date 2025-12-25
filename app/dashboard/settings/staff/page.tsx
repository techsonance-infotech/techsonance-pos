"use client"

import { useState, useEffect } from "react"
import { Home, ArrowLeft, Users, Plus, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getStoreStaff } from "@/app/actions/user"
import { StaffModal } from "@/components/admin/staff-modal"
import { StaffDetailModal } from "@/components/admin/staff-detail-modal"
import { cn } from "@/lib/utils"

export default function StaffSettingsPage() {
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Staff Modal State (Create/Edit)
    const [staffModalOpen, setStaffModalOpen] = useState(false)
    const [staffModalMode, setStaffModalMode] = useState<'create' | 'edit'>('create')
    const [selectedStaff, setSelectedStaff] = useState<any>(null)

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [detailUser, setDetailUser] = useState<any>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const data = await getStoreStaff()
        setStaff(data)
        setLoading(false)
    }

    // Handle Create
    const handleCreate = () => {
        setSelectedStaff(null)
        setStaffModalMode('create')
        setStaffModalOpen(true)
    }

    // Handle Edit
    const handleEdit = (user: any, e?: React.MouseEvent) => {
        e?.stopPropagation()
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

    // Calculate Stats
    const totalStaff = staff.length
    const activeStaff = staff.filter(s => !s.isLocked).length
    const inactiveStaff = staff.filter(s => s.isLocked).length

    // Group by role
    const rolesCount = staff.reduce((acc, curr) => {
        const roleName = curr.role || 'USER'
        acc[roleName] = (acc[roleName] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const roleBreakdownText = Object.entries(rolesCount)
        .map(([role, count]) => `${role.replace('_', ' ')} (${count})`)
        .join(', ')

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-100 text-purple-700'
            case 'BUSINESS_OWNER':
                return 'bg-blue-100 text-blue-700'
            case 'MANAGER':
                return 'bg-green-100 text-green-700'
            case 'CASHIER':
                return 'bg-orange-100 text-orange-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit animate-in fade-in slide-in-from-top-2">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">More Options</Link>
                <span>/</span>
                <span className="font-medium text-orange-600">Staff Management</span>
            </div>

            {/* Back Link */}
            <div>
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-gray-500 mt-2 text-lg">Manage staff members and their roles</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left: Staff List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Users className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Staff List</h2>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400">Loading staff...</div>
                        ) : staff.length === 0 ? (
                            <div className="py-12 text-center">
                                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400 mb-4">No staff members found.</p>
                                <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Your First Staff Member
                                </Button>
                            </div>
                        ) : (
                            staff.map((member) => (
                                <div
                                    key={member.id}
                                    onClick={() => handleRowClick(member)}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 transition-all border border-transparent hover:border-purple-200 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {member.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{member.username}</h3>
                                            <p className="text-sm text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold",
                                            getRoleBadge(member.role)
                                        )}>
                                            {member.role?.replace('_', ' ') || 'USER'}
                                        </span>
                                        {member.isLocked ? (
                                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                Disabled
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                Active
                                            </span>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleEdit(member, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Full-width Add Button at Bottom */}
                    <Button
                        onClick={handleCreate}
                        className="w-full mt-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold h-14 text-lg shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add New Staff Member
                    </Button>
                </div>

                {/* Right: Overview Panel */}
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-8 h-full min-h-[300px]">
                    <h3 className="text-purple-900 font-bold mb-6 text-lg">Staff Overview</h3>

                    <div className="space-y-5">
                        <div className="flex gap-3 text-purple-800 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">
                                Total Staff: <span className="font-bold">{totalStaff}</span>
                            </p>
                        </div>

                        <div className="flex gap-3 text-purple-800 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">
                                Active: <span className="font-bold">{activeStaff}</span>
                            </p>
                        </div>

                        <div className="flex gap-3 text-purple-800 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">
                                Inactive: <span className="font-bold">{inactiveStaff}</span>
                            </p>
                        </div>

                        <div className="flex gap-3 text-purple-800 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">
                                Roles: <span className="font-bold">{roleBreakdownText || 'None'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff Create/Edit Modal */}
            <StaffModal
                isOpen={staffModalOpen}
                onClose={() => {
                    setStaffModalOpen(false)
                    setSelectedStaff(null)
                }}
                mode={staffModalMode}
                user={selectedStaff}
                onSuccess={() => loadData()}
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
                onSuccess={() => loadData()}
            />
        </div>
    )
}
