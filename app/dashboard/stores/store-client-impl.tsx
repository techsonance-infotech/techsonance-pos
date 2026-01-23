"use client"

import { useState, useEffect } from "react"
import { Building2, MapPin, Check, Plus, Edit, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { switchStore, createStore, updateStore, deleteStore } from "@/app/actions/store"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getPOSService } from "@/lib/pos-service"
import { useNetworkStatus } from "@/hooks/use-network-status"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

export default function StoreManagementClient({ user: initialUser }: { user: any }) {
    const router = useRouter()
    const isOnline = useNetworkStatus()
    const [user, setUser] = useState<any>(initialUser)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingStore, setEditingStore] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!initialUser) {
            // Load from cache
            const loadUser = async () => {
                try {
                    const posService = getPOSService()
                    const settings = await posService.getSettings()
                    const profileSetting = settings.find((s: any) => s.key === 'user_profile')
                    if (profileSetting && profileSetting.value) {
                        setUser(profileSetting.value)
                    }
                } catch (e) {
                    console.error("Failed to load cached user", e)
                }
            }
            loadUser()
        }
    }, [initialUser])

    if (!user) return <div className="p-8 text-center text-gray-500">Loading stores...</div>

    // Form States
    const [name, setName] = useState("")
    const [location, setLocation] = useState("")
    const [tableMode, setTableMode] = useState(true)

    const resetForm = () => {
        setName("")
        setLocation("")
        setTableMode(true)
        setIsCreateOpen(false)
        setEditingStore(null)
        setLoading(false)
    }

    const handleSwitch = async (storeId: string) => {
        const res = await switchStore(storeId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Store switched successfully")
            router.refresh()
            if (res.tableMode === false) {
                router.push("/dashboard/new-order")
            } else {
                router.push("/dashboard/tables")
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData()
        formData.append("name", name)
        formData.append("location", location)
        formData.append("tableMode", String(tableMode))

        let res
        if (editingStore) {
            res = await updateStore(editingStore.id, formData)
        } else {
            res = await createStore(formData)
        }

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(editingStore ? "Store updated" : "Store created")
            router.refresh()
            resetForm()
        }
        setLoading(false)
    }

    const openEdit = (store: any) => {
        setEditingStore(store)
        setName(store.name)
        setLocation(store.location)
        setTableMode(store.tableMode ?? true)
    }

    const handleDelete = async (storeId: string) => {
        if (!confirm("Are you sure you want to delete this store? All data (orders, menu, history) will be permanently deleted.")) return

        const res = await deleteStore(storeId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Store deleted")
            router.refresh()
        }
    }

    const canManage = user.role === 'BUSINESS_OWNER' || user.role === 'SUPER_ADMIN'

    return (
        <div>
            {/* Top Bar */}
            {canManage && (
                <div className="flex justify-end mb-6">
                    <Button onClick={() => setIsCreateOpen(true)} disabled={!isOnline} className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50">
                        <Plus className="mr-2 h-4 w-4" /> Add New Store
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user.stores.map((store: any) => {
                    const isActive = user.defaultStoreId === store.id
                    return (
                        <div key={store.id} className={`bg-white rounded-xl p-6 border transition-all ${isActive ? 'border-orange-200 ring-4 ring-orange-50 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-1">
                                    <Building2 className="h-5 w-5 text-gray-400" />
                                    {store.name}
                                </div>
                                {isActive && <CheckCircleIcon />}
                            </div>

                            <div className="flex flex-col gap-2 mb-6">
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <MapPin className="h-4 w-4" />
                                    {store.location}
                                </div>
                                <span className={`w-fit px-2 py-0.5 rounded-[4px] text-xs font-medium border ${store.tableMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                    {store.tableMode ? 'Dine-in Mode' : 'Counter Mode'}
                                </span>
                            </div>

                            {isActive ? (
                                <div className="w-full py-2.5 bg-orange-50 text-orange-700 font-medium rounded-lg text-center border border-orange-100 mb-4">
                                    Active Store
                                </div>
                            ) : (
                                <Button
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white mb-4 disabled:opacity-50"
                                    onClick={() => handleSwitch(store.id)}
                                    disabled={!isOnline}
                                    title={!isOnline ? "Offline" : "Switch Store"}
                                >
                                    Switch to This Store
                                </Button>
                            )}

                            {/* Management Actions */}
                            {canManage && (
                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(store)} disabled={!isOnline} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(store.id)} disabled={!isOnline} className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50">
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                    </Button>
                                </div>
                            )}

                            <div className="mt-2 text-[10px] text-gray-300">
                                ID: {store.id.substring(0, 8)}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isCreateOpen || !!editingStore} onOpenChange={(open) => !open && resetForm()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStore ? "Edit Store" : "Create New Store"}</DialogTitle>
                        <DialogDescription>
                            {editingStore ? "Update store details." : "Add a new outlet location."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Store Name</Label>
                            <Input
                                placeholder="e.g. Vesu Outlet"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Location / Address</Label>
                            <Input
                                placeholder="e.g. 123 Main St, Surat"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2 py-2">
                            <Switch id="table-mode" checked={tableMode} onCheckedChange={setTableMode} />
                            <Label htmlFor="table-mode">Enable Table Management (Dine-in Mode)</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {loading ? "Saving..." : (editingStore ? "Update" : "Create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    )
}

function CheckCircleIcon() {
    return (
        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 border-4 border-white shadow-sm">
            <Check className="h-4 w-4" strokeWidth={3} />
        </div>
    )
}
