import { useState } from "react"
import { updateUserModules, updateUserStores } from "@/app/actions/security"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const MODULES = [
    { id: "orders", label: "New Order & Recent Orders" },
    { id: "tables", label: "Table Management" },
    { id: "menu", label: "Menu Management" },
    { id: "stores", label: "Store Management" },
    { id: "notifications", label: "Notifications" },
]

interface PermissionDialogProps {
    user: any
    stores: any[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UserPermissionDialog({ user, stores, open, onOpenChange }: PermissionDialogProps) {
    const [disabled, setDisabled] = useState<string[]>(user.disabledModules || [])
    const [assignedStoreIds, setAssignedStoreIds] = useState<string[]>(user.stores?.map((s: any) => s.id) || [])
    const [defaultStoreId, setDefaultStoreId] = useState<string | null>(user.defaultStoreId || null)
    const [loading, setLoading] = useState(false)

    const handleToggle = (id: string, checked: boolean) => {
        setDisabled(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
    }

    const handleStoreToggle = (storeId: string, checked: boolean) => {
        let newIds = checked
            ? [...assignedStoreIds, storeId]
            : assignedStoreIds.filter(id => id !== storeId)

        setAssignedStoreIds(newIds)

        // If unchecked default store, clear default
        if (!checked && defaultStoreId === storeId) {
            setDefaultStoreId(null)
        }
        // If checked and no default, set as default
        if (checked && newIds.length === 1) {
            setDefaultStoreId(storeId)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        // Save Modules
        const modRes = await updateUserModules(user.id, disabled)

        // Save Stores
        const storeRes = await updateUserStores(user.id, assignedStoreIds, defaultStoreId)

        if (modRes.success && storeRes.success) {
            toast.success("User settings updated")
            onOpenChange(false)
        } else {
            toast.error("Failed to update settings")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Access: {user.username}</DialogTitle>
                    <DialogDescription>
                        Configure permissions and store access
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Permissions Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Module Access</h3>
                        <p className="text-xs text-gray-500">Uncheck to enable module</p>
                        <div className="grid grid-cols-1 gap-2">
                            {MODULES.map(mod => (
                                <div key={mod.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={mod.id}
                                        checked={!disabled.includes(mod.id)}
                                        onCheckedChange={(c) => handleToggle(mod.id, c === false)}
                                    />
                                    <Label htmlFor={mod.id} className="cursor-pointer">
                                        {mod.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stores Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Store Assignment</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {stores.map(store => {
                                const isAssigned = assignedStoreIds.includes(store.id)
                                return (
                                    <div key={store.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id={`store-${store.id}`}
                                                checked={isAssigned}
                                                onCheckedChange={(c) => handleStoreToggle(store.id, !!c)}
                                            />
                                            <div>
                                                <Label htmlFor={`store-${store.id}`} className="font-medium cursor-pointer block">
                                                    {store.name}
                                                </Label>
                                                <p className="text-xs text-gray-500">{store.location}</p>
                                            </div>
                                        </div>

                                        {isAssigned && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    id={`default-${store.id}`}
                                                    name="defaultStore"
                                                    checked={defaultStoreId === store.id}
                                                    onChange={() => setDefaultStoreId(store.id)}
                                                    className="accent-orange-600 h-4 w-4"
                                                />
                                                <Label htmlFor={`default-${store.id}`} className="text-xs text-gray-600 cursor-pointer">
                                                    Default
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {stores.length === 0 && <p className="text-sm text-gray-500 italic">No stores available</p>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
