"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createUser, updateUser } from "@/app/actions/admin-users"
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const MODULES = [
    { id: "orders", label: "New Order & Recent Orders" },
    { id: "tables", label: "Table Management" },
    { id: "menu", label: "Menu Management" },
    { id: "stores", label: "Store Management" },
    { id: "notifications", label: "Notifications" },
]

type StaffFormData = {
    username: string
    email: string
    contactNo: string
    password: string
    confirmPassword: string
    role: string
    disabledModules: string[]
    storeId: string
}

type StaffModalProps = {
    isOpen: boolean
    onClose: () => void
    mode: 'create' | 'edit'
    user?: any
    stores?: any[]
    onSuccess?: () => void
}

// Password requirement indicator
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{text}</span>
        </div>
    )
}

export function StaffModal({ isOpen, onClose, mode, user, stores = [], onSuccess }: StaffModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<StaffFormData>({
        username: '',
        email: '',
        contactNo: '',
        password: '',
        confirmPassword: '',
        role: 'USER',
        disabledModules: [],
        storeId: ''
    })

    // Validation State
    const [touched, setTouched] = useState<Record<string, boolean>>({})
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Reset form when modal opens or user changes
    useEffect(() => {
        if (isOpen) {
            setTouched({})
            setShowPassword(false)
            setShowConfirmPassword(false)

            if (mode === 'edit' && user) {
                setFormData({
                    username: user.username || '',
                    email: user.email || '',
                    contactNo: user.contactNo || '',
                    password: '',
                    confirmPassword: '',
                    role: user.role || 'USER',
                    disabledModules: user.disabledModules || [],
                    storeId: user.defaultStoreId || user.stores?.[0]?.id || ''
                })
            } else {
                setFormData({
                    username: '',
                    email: '',
                    contactNo: '',
                    password: '',
                    confirmPassword: '',
                    role: 'USER',
                    disabledModules: [],
                    storeId: stores.length > 0 ? stores[0].id : ''
                })
            }
        }
    }, [mode, user, isOpen])

    // --- Validation Logic ---

    // Username validation: 3-20 chars, alphanumeric + underscore
    const isUsernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(formData.username)

    // Email validation
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)

    // phone validation
    const isPhoneValid = formData.contactNo === '' || /^\d{10}$/.test(formData.contactNo)

    // Password validations (Only for CREATE mode)
    const hasMinLength = formData.password.length >= 8
    const hasUppercase = /[A-Z]/.test(formData.password)
    const hasLowercase = /[a-z]/.test(formData.password)
    const hasNumber = /[0-9]/.test(formData.password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)
    const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ''

    // Overall Validity
    const isFormValid = mode === 'create'
        ? (isUsernameValid && isEmailValid && isPhoneValid && isPasswordStrong && passwordsMatch && formData.role)
        : (isUsernameValid && isEmailValid && isPhoneValid && formData.role) // Skip password for edit

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const getInputClass = (isValid: boolean, fieldName: string, value: string) => {
        // Edit mode skips password validation coloring if empty
        if (mode === 'edit' && (fieldName === 'password' || fieldName === 'confirmPassword')) return ""

        const baseClass = "h-10 text-sm bg-white border rounded-lg focus:ring-1 focus:ring-orange-600"
        if (!touched[fieldName] || value === '') return `${baseClass} border-gray-200 focus:border-orange-600`
        return isValid
            ? `${baseClass} border-green-500 focus:border-green-500`
            : `${baseClass} border-red-500 focus:border-red-500`
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
        setFormData({ ...formData, contactNo: value })
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isFormValid) return
        setLoading(true)

        try {
            if (mode === 'create') {
                const result = await createUser({
                    username: formData.username,
                    email: formData.email,
                    contactNo: formData.contactNo,
                    password: formData.password,
                    role: formData.role,
                    disabledModules: formData.disabledModules,
                    storeId: formData.storeId
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
                    role: formData.role,
                    disabledModules: formData.disabledModules,
                    storeId: formData.storeId
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                                onBlur={() => handleBlur('username')}
                                placeholder="johndoe"
                                required
                                className={getInputClass(isUsernameValid, 'username', formData.username)}
                            />
                            {touched.username && formData.username && !isUsernameValid && (
                                <p className="text-xs text-red-500">3-20 chars, letters, numbers, underscores only</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                onBlur={() => handleBlur('email')}
                                placeholder="john@example.com"
                                required
                                className={getInputClass(isEmailValid, 'email', formData.email)}
                            />
                            {touched.email && formData.email && !isEmailValid && (
                                <p className="text-xs text-red-500">Please enter a valid email address</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contactNo">Contact Number</Label>
                            <Input
                                id="contactNo"
                                type="tel"
                                value={formData.contactNo}
                                onChange={handlePhoneChange}
                                onBlur={() => handleBlur('contactNo')}
                                placeholder="Enter 10-digit number"
                                className={getInputClass(isPhoneValid, 'contactNo', formData.contactNo)}
                            />
                            {touched.contactNo && formData.contactNo && !isPhoneValid && (
                                <p className="text-xs text-red-500">Must be exactly 10 digits</p>
                            )}
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
                                    <SelectItem value="CASHIER">Cashier</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Store Assignment */}
                        <div className="grid gap-2">
                            <Label htmlFor="store">Assign Store *</Label>
                            <Select
                                value={formData.storeId}
                                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                            >
                                <SelectTrigger id="store">
                                    <SelectValue placeholder="Select a store" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map((store) => (
                                        <SelectItem key={store.id} value={store.id}>
                                            {store.name} ({store.location})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Module Permissions */}
                        <div className="space-y-3 pt-2">
                            <Label>Module Access</Label>
                            <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 bg-gray-50/50">
                                {MODULES.map(mod => (
                                    <div key={mod.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`mod-${mod.id}`}
                                            checked={!formData.disabledModules.includes(mod.id)}
                                            onCheckedChange={(checked) => {
                                                const current = new Set(formData.disabledModules)
                                                if (checked) {
                                                    // Enable = remove from disabled list
                                                    current.delete(mod.id)
                                                } else {
                                                    // Disable = add to disabled list
                                                    current.add(mod.id)
                                                }
                                                setFormData({ ...formData, disabledModules: Array.from(current) })
                                            }}
                                            className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                        />
                                        <Label htmlFor={`mod-${mod.id}`} className="cursor-pointer font-normal text-sm">
                                            {mod.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {mode === 'create' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            onBlur={() => handleBlur('password')}
                                            placeholder="••••••••"
                                            required
                                            className={`${getInputClass(isPasswordStrong, 'password', formData.password)} pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Password Strength Indicators */}
                                    {formData.password && (
                                        <div className="grid grid-cols-2 gap-1 mt-1 bg-gray-50 p-2 rounded-md border border-gray-100">
                                            <PasswordRequirement met={hasMinLength} text="8+ chars" />
                                            <PasswordRequirement met={hasUppercase} text="Uppercase" />
                                            <PasswordRequirement met={hasLowercase} text="Lowercase" />
                                            <PasswordRequirement met={hasNumber} text="Number" />
                                            <PasswordRequirement met={hasSpecial} text="Special" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            onBlur={() => handleBlur('confirmPassword')}
                                            placeholder="••••••••"
                                            required
                                            className={`${getInputClass(passwordsMatch, 'confirmPassword', formData.confirmPassword)} pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {touched.confirmPassword && formData.confirmPassword && !passwordsMatch && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                    )}
                                    {formData.confirmPassword && passwordsMatch && (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Passwords Match
                                        </p>
                                    )}
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
                        <Button
                            type="submit"
                            disabled={loading || !isFormValid}
                            className="bg-orange-600 hover:bg-orange-700 transition-all text-white"
                        >
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
