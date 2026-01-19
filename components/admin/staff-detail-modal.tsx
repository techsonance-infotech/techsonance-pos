"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Calendar, Shield, MapPin, Edit, Trash2, Lock, Unlock } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { deleteUser } from "@/app/actions/admin-users"
import { toast } from "sonner"

type StaffDetailModalProps = {
    isOpen: boolean
    onClose: () => void
    user: any
    onEdit: () => void
    onSuccess?: () => void
}

export function StaffDetailModal({ isOpen, onClose, user, onEdit, onSuccess }: StaffDetailModalProps) {
    const [loading, setLoading] = useState(false)

    if (!user) return null

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to disable ${user.username}'s account? They will not be able to login.`)) {
            return
        }

        setLoading(true)
        try {
            const result = await deleteUser(user.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("User account disabled successfully")
                onSuccess?.()
                onClose()
            }
        } catch (error) {
            toast.error("Failed to disable user")
        } finally {
            setLoading(false)
        }
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
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Staff Details</DialogTitle>
                    <DialogDescription>
                        View and manage staff member information
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                {user.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{user.username}</h3>
                                <Badge className={`mt-1 ${getRoleBadgeColor(user.role)}`}>
                                    {user.role.replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>

                        {user.isLocked && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                            </Badge>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Email</p>
                                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            </div>
                        </div>

                        {user.contactNo && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Contact Number</p>
                                    <p className="text-sm font-medium text-gray-900">{user.contactNo}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Shield className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Role</p>
                                <p className="text-sm font-medium text-gray-900">{user.role.replace('_', ' ')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Joined Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {user.stores && user.stores.length > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Assigned Stores</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {user.stores.map((store: any) => (
                                            <Badge key={store.id} variant="outline" className="text-xs">
                                                {store.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                        {!['SUPER_ADMIN', 'BUSINESS_OWNER'].includes(user.role) ? (
                            <>
                                <Button
                                    onClick={onEdit}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Details
                                </Button>
                                <Button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {loading ? 'Disabling...' : 'Disable Account'}
                                </Button>
                            </>
                        ) : (
                            <div className="w-full p-3 bg-blue-50 text-blue-700 text-center rounded-lg text-sm font-medium">
                                System Account: Cannot be edited or disabled
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
