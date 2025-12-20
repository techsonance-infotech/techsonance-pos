"use client"

import { useState, useEffect } from "react"
import { Home, ArrowLeft, Users, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getStoreStaff } from "@/app/actions/user"
import { cn } from "@/lib/utils"

export default function StaffSettingsPage() {
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const data = await getStoreStaff()
        setStaff(data)
        setLoading(false)
    }

    // Calculate Stats
    const totalStaff = staff.length
    const activeStaff = staff.length // Assuming all fetched are active for now as per schema
    const inactiveStaff = 0

    // Group by role
    const rolesCount = staff.reduce((acc, curr) => {
        const roleName = curr.role === 'BUSINESS_OWNER' ? 'Manager' : 'Cashier' // Simplified mapping for UI
        acc[roleName] = (acc[roleName] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const roleBreakdownText = Object.entries(rolesCount)
        .map(([role, count]) => `${role} (${count})`)
        .join(', ')

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
                <p className="text-gray-500 mt-2 text-lg">Manage your settings and preferences</p>
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

                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400">Loading staff...</div>
                        ) : staff.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">No staff members found.</div>
                        ) : (
                            staff.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 transition-colors border border-transparent hover:border-gray-200">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{member.username}</h3>
                                        <p className="text-sm text-gray-500">
                                            {member.role === 'BUSINESS_OWNER' ? 'Manager' : 'Cashier'}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                        Active
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <Button className="w-full mt-8 bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-lg shadow-lg shadow-purple-200">
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
        </div>
    )
}
