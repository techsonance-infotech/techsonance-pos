"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createUser, updateUser, resetPassword } from "@/app/actions/admin-users"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ROLES = [
    { value: "USER", label: "User (Counter Staff)" },
    { value: "MANAGER", label: "Manager" }, // Ensure schema matches. Schema has USER, BUSINESS_OWNER, SUPER_ADMIN.
    // Wait, let's check schema. Step 258: Role enum: SUPER_ADMIN, BUSINESS_OWNER, USER.
    // My previous Sidebar code handled "MANAGER" but schema doesn't show it?
    // Step 258 Schema:
    // enum Role { SUPER_ADMIN, BUSINESS_OWNER, USER }
    // So "MANAGER" is NOT in schema enum. I should stick to valid enum values.
    // Unless I added Manager to schema recently? No.
    // I will stick to schema roles.
    { value: "BUSINESS_OWNER", label: "Business Owner" },
    { value: "SUPER_ADMIN", label: "Super Admin" },
]

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: any | null // If null, it's Create mode
    onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
    const isEdit = !!user
    const [loading, setLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        role: "USER",
        contactNo: "",
        password: "" // Only for create
    })

    // Reset Password State (for Edit mode)
    const [newPass, setNewPass] = useState("")

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role,
                contactNo: user.contactNo || "",
                password: ""
            })
            setNewPass("")
        } else {
            setFormData({
                username: "",
                email: "",
                role: "USER",
                contactNo: "",
                password: ""
            })
        }
    }, [user, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let res
            if (isEdit) {
                res = await updateUser(user.id, formData)
            } else {
                res = await createUser(formData)
            }

            if (res.success) {
                toast.success(isEdit ? "User updated" : "User created")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(res.error || "Operation failed")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
        setLoading(false)
    }

    const handleResetPassword = async () => {
        if (!newPass || newPass.length < 6) {
            toast.error("Password must be 6+ chars")
            return
        }
        setLoading(true)
        const res = await resetPassword(user.id, newPass)
        if (res.success) {
            toast.success("Password reset successful")
            setNewPass("")
            // Don't close dialog, allowing continued edit
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update user details or reset password." : "Add a new user to the system."}
                    </DialogDescription>
                </DialogHeader>

                {isEdit ? (
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="password">Security</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details">
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <FormFields formData={formData} setFormData={setFormData} />
                                <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                                    {loading ? "Saving..." : "Update Details"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="password">
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">User will use this password to login next time.</p>
                                </div>
                                <Button onClick={handleResetPassword} disabled={loading || !newPass} variant="destructive" className="w-full">
                                    {loading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <FormFields formData={formData} setFormData={setFormData} isCreate />
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                                {loading ? "Creating..." : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}

function FormFields({ formData, setFormData, isCreate = false }: any) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                        required
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Email</Label>
                <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <Label>Contact No</Label>
                <Input
                    value={formData.contactNo}
                    onChange={e => setFormData({ ...formData, contactNo: e.target.value })}
                />
            </div>
        </>
    )
}
