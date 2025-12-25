import { prisma } from "@/lib/prisma"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { UsersTable } from "@/components/admin/users-table"
import { PendingApprovals } from "@/components/admin/pending-approvals"
import { Badge } from "@/components/ui/badge"
import { Home, Users, Shield, UserCheck, UserX, Clock } from "lucide-react"

export default async function UsersPage() {
    const currentUser = await getUserProfile()
    if (currentUser?.role !== 'SUPER_ADMIN') redirect('/dashboard')

    // Fetch all users (isApproved property not in schema)
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { stores: true }
    })

    // Pending users feature disabled (isApproved not in schema)
    const pendingUsers: any[] = []

    const allStores = await prisma.store.findMany({
        select: { id: true, name: true, location: true },
        orderBy: { name: 'asc' }
    })

    // Calculate stats
    const totalUsers = users.length + pendingUsers.length
    const activeUsers = users.filter(u => !u.isLocked).length
    const lockedUsers = users.filter(u => u.isLocked).length
    const adminUsers = users.filter(u => u.role === 'SUPER_ADMIN').length

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <span className="text-gray-400">Settings</span>
                <span>/</span>
                <span className="font-medium text-orange-600">User Management</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage users, lock accounts, track IPs, and configure permissions</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Total Users</p>
                            <p className="text-3xl font-bold text-blue-900">{totalUsers}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Active Users</p>
                            <p className="text-3xl font-bold text-green-900">{activeUsers}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <UserCheck className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600 mb-1">Locked Users</p>
                            <p className="text-3xl font-bold text-red-900">{lockedUsers}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <UserX className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600 mb-1">Administrators</p>
                            <p className="text-3xl font-bold text-purple-900">{adminUsers}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-600 mb-1">Pending Approvals</p>
                            <p className="text-3xl font-bold text-orange-900">{pendingUsers.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
                            <p className="text-gray-500 mt-1">Review and approve new user registrations</p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border border-orange-200 text-lg px-4 py-2">
                            {pendingUsers.length} Pending
                        </Badge>
                    </div>
                    <PendingApprovals pendingUsers={pendingUsers} />
                </div>
            )}

            {/* Approved Users Table */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Approved Users</h2>
                    <p className="text-gray-500 mt-1">Manage existing users and permissions</p>
                </div>
                <UsersTable users={users} stores={allStores} />
            </div>
        </div>
    )
}
