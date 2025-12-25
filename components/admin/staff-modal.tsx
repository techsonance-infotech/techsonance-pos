"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createUser, updateUser } from "@/app/actions/admin-users"
import { Loader2 } from "lucide-react"

type StaffFormData = {
    username: string
    email: string
    contactNo: string
    password: string
    confirmPassword: string
    role: string
}

type StaffModalProps = {
    isOpen: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    user?: any
    onSuccess?: () => void
}

export function StaffModal({ isOpen, onClose, mode, user, onSuccess }: StaffModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<StaffFormData>({
        username: '',
        email: '',
        contactNo: '',
        password: '',
        confirmPassword: '',
        role: 'USER'
    })

    useEffect(() => {
        if (mode === 'edit' && user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                contactNo: user.contactNo || '',
                password: '',
                confirmPassword: '',
                role: user.role || 'USER'
            })
        } else {
            setFormData({
                username: '',
                email: '',
                contactNo: '',
                password: '',
                confirmPassword: '',
                role: 'USER'
            })
        }
    }, [mode, user, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (mode === 'create') {
                // Validate passwords match
                if (formData.password !== formData.confirmPassword) {
                    toast.error("Passwords do not match")
                    setLoading(false)
                    return
                }

                if (formData.password.length < 6) {
                    toast.error("Password must be at least 6 characters")
                    setLoading(false)
                    return
                }

                const result = await createUser({
                    username: formData.username,
                    email: formData.email,
                    contactNo: formData.contactNo,
                    password: formData.password,
                    role: formData.role
                })

                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Staff member created successfully!")
                    onSuccess?.()
                    onClose()
                }
            } else {
                // Edit mode
                const result = await updateUser(user.id, {
                    username: formData.username,
                    email: formData.email,
                    contactNo: formData.contactNo,
                    role: formData.role
                })

                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Staff member updated successfully!")
                    onSuccess?.()
                    onClose()
                }
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {mode === 'create' ? 'Create New Staff Member' : 'Edit Staff Member'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Add a new staff member to your system'
                            : 'Update staff member information'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username *</Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="johndoe"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contactNo">Contact Number</Label>
                            <Input
                                id="contactNo"
                                type="tel"
                                value={formData.contactNo}
                                onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                                placeholder="+1234567890"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="BUSINESS_OWNER">Business Owner</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {mode === 'create' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        {mode === 'edit' && user && (
                            <Button
                                type="button"
                                variant={user.isLocked ? "default" : "destructive"}
                                onClick={async () => {
                                    const actionText = user.isLocked ? 'enable' : 'disable'

                                    if (!confirm(`Are you sure you want to ${actionText} ${user.username}'s account?`)) {
                                        return
                                    }
                                    setLoading(true)
                                    try {
                                        if (user.isLocked) {
                                            // Enable the account
                                            const { enableUser } = await import('@/app/actions/admin-users')
                                            const result = await enableUser(user.id)
                                            if (result.error) {
                                                toast.error(result.error)
                                            } else {
                                                toast.success("User account enabled successfully")
                                                onSuccess?.()
                                                onClose()
                                            }
                                        } else {
                                            // Disable the account
                                            const { deleteUser } = await import('@/app/actions/admin-users')
                                            const result = await deleteUser(user.id)
                                            if (result.error) {
                                                toast.error(result.error)
                                            } else {
                                                toast.success("User account disabled successfully")
                                                onSuccess?.()
                                                onClose()
                                            }
                                        }
                                    } catch (error) {
                                        toast.error(`Failed to ${actionText} user`)
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                                disabled={loading}
                                className={user.isLocked ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                                {loading ? 'Processing...' : (user.isLocked ? 'Enable Account' : 'Disable Account')}
                            </Button>
                        )}
                        <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                                </>
                            ) : (
                                mode === 'create' ? 'Create Staff' : 'Update Staff'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
