'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, User, Mail, Phone, Calendar } from "lucide-react"
import { approveUser, rejectUser } from "@/app/actions/user"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function PendingApprovals({ pendingUsers }: { pendingUsers: any[] }) {
    const router = useRouter()
    const [processing, setProcessing] = useState<string | null>(null)

    const handleApprove = async (userId: string, username: string) => {
        if (!confirm(`Approve registration for ${username}?`)) return

        setProcessing(userId)
        const result = await approveUser(userId)
        setProcessing(null)

        if (result.success) {
            toast.success(`${username} has been approved`)
            router.refresh()
        } else {
            toast.error(result.error || "Failed to approve user")
        }
    }

    const handleReject = async (userId: string, username: string) => {
        if (!confirm(`Reject and delete registration for ${username}? This action cannot be undone.`)) return

        setProcessing(userId)
        const result = await rejectUser(userId)
        setProcessing(null)

        if (result.success) {
            toast.success(`${username}'s registration has been rejected`)
            router.refresh()
        } else {
            toast.error(result.error || "Failed to reject user")
        }
    }

    if (pendingUsers.length === 0) {
        return (
            <div className="rounded-2xl bg-white shadow-md p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">No Pending Approvals</h3>
                        <p className="text-sm text-gray-500 mt-1">All registration requests have been processed</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map((user) => (
                    <div
                        key={user.id}
                        className="rounded-2xl bg-gradient-to-br from-orange-50/50 to-white shadow-md p-6 hover:shadow-xl transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border border-orange-200">
                                Pending
                            </Badge>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div>
                                <p className="font-semibold text-gray-900 text-lg">{user.username}</p>
                                <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                {user.contactNo && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span>{user.contactNo}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleApprove(user.id, user.username)}
                                disabled={processing === user.id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                            >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                            </Button>
                            <Button
                                onClick={() => handleReject(user.id, user.username)}
                                disabled={processing === user.id}
                                variant="outline"
                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                size="sm"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
