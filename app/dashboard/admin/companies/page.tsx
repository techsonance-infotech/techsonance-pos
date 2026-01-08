"use client"

import { useEffect, useState } from "react"
import { Building, Plus, Pencil, Trash2, Store, Users, ToggleLeft, ToggleRight, Home, ChevronRight, UserPlus, X, Check, Key, Copy, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCompanies, createCompany, updateCompany, deleteCompany, toggleCompanyStatus, assignUserToCompany, getUnassignedUsers, getCompanyUsers, removeUserFromCompany } from "@/app/actions/company"
import { toast } from "sonner"

type Company = {
    id: string
    name: string
    slug: string
    logo: string | null
    address: string | null
    phone: string | null
    email: string | null
    isActive: boolean
    createdAt: Date
    _count: {
        stores: number
        users: number
    }
}

type User = {
    id: string
    username: string
    email: string
    role: string
    companyId: string | null
}

export default function CompanyManagementPage() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingCompany, setEditingCompany] = useState<Company | null>(null)

    // User assignment state
    const [showUserModal, setShowUserModal] = useState(false)
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const [unassignedUsers, setUnassignedUsers] = useState<User[]>([])
    const [companyUsers, setCompanyUsers] = useState<User[]>([])
    const [userModalLoading, setUserModalLoading] = useState(false)

    // Credentials modal state
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [credentialsCompany, setCredentialsCompany] = useState<Company | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
        phone: "",
        email: ""
    })

    useEffect(() => {
        loadCompanies()
    }, [])

    async function loadCompanies() {
        setIsLoading(true)
        const result = await getCompanies()
        if (result.companies) {
            setCompanies(result.companies)
        }
        setIsLoading(false)
    }

    function resetForm() {
        setFormData({ name: "", slug: "", address: "", phone: "", email: "" })
        setEditingCompany(null)
        setShowForm(false)
    }

    function generateSlug(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (editingCompany) {
            const result = await updateCompany(editingCompany.id, formData)
            if (result.success) {
                toast.success("Company updated successfully")
                loadCompanies()
                resetForm()
            } else {
                toast.error(result.error || "Failed to update company")
            }
        } else {
            const result = await createCompany(formData)
            if (result.success) {
                if (result.adminCredentials) {
                    toast.success(
                        <div className="space-y-1">
                            <p className="font-semibold">Company created successfully!</p>
                            <p className="text-sm">Admin: {result.adminCredentials.email}</p>
                            <p className="text-sm">Password: {result.adminCredentials.password}</p>
                        </div>,
                        { duration: 10000 }
                    )
                } else {
                    toast.success("Company created successfully")
                }
                loadCompanies()
                resetForm()
            } else {
                toast.error(result.error || "Failed to create company")
            }
        }
    }

    async function handleDelete(company: Company) {
        if (!confirm(`Are you sure you want to delete "${company.name}"? This will also delete all stores, users, and orders associated with this company.`)) {
            return
        }

        const result = await deleteCompany(company.id)
        if (result.success) {
            toast.success("Company deleted successfully")
            loadCompanies()
        } else {
            toast.error(result.error || "Failed to delete company")
        }
    }

    async function handleToggleStatus(company: Company) {
        const result = await toggleCompanyStatus(company.id)
        if (result.success) {
            toast.success(result.message)
            loadCompanies()
        } else {
            toast.error(result.error || "Failed to update company status")
        }
    }

    function startEdit(company: Company) {
        setEditingCompany(company)
        setFormData({
            name: company.name,
            slug: company.slug,
            address: company.address || "",
            phone: company.phone || "",
            email: company.email || ""
        })
        setShowForm(true)
    }

    // User assignment functions
    async function openUserModal(company: Company) {
        setSelectedCompany(company)
        setShowUserModal(true)
        setUserModalLoading(true)

        const [unassignedResult, companyResult] = await Promise.all([
            getUnassignedUsers(),
            getCompanyUsers(company.id)
        ])

        if (unassignedResult.users) {
            setUnassignedUsers(unassignedResult.users)
        }
        if (companyResult.users) {
            setCompanyUsers(companyResult.users)
        }
        setUserModalLoading(false)
    }

    function closeUserModal() {
        setShowUserModal(false)
        setSelectedCompany(null)
        setUnassignedUsers([])
        setCompanyUsers([])
    }

    async function handleAssignUser(userId: string) {
        if (!selectedCompany) return

        const result = await assignUserToCompany(userId, selectedCompany.id)
        if (result.success) {
            toast.success("User assigned to company")
            // Refresh the modal data
            const [unassignedResult, companyResult] = await Promise.all([
                getUnassignedUsers(),
                getCompanyUsers(selectedCompany.id)
            ])
            if (unassignedResult.users) setUnassignedUsers(unassignedResult.users)
            if (companyResult.users) setCompanyUsers(companyResult.users)
            loadCompanies() // Refresh company counts
        } else {
            toast.error(result.error || "Failed to assign user")
        }
    }

    async function handleRemoveUser(userId: string) {
        if (!selectedCompany) return

        const result = await removeUserFromCompany(userId)
        if (result.success) {
            toast.success("User removed from company")
            // Refresh the modal data
            const [unassignedResult, companyResult] = await Promise.all([
                getUnassignedUsers(),
                getCompanyUsers(selectedCompany.id)
            ])
            if (unassignedResult.users) setUnassignedUsers(unassignedResult.users)
            if (companyResult.users) setCompanyUsers(companyResult.users)
            loadCompanies() // Refresh company counts
        } else {
            toast.error(result.error || "Failed to remove user")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <a href="/dashboard/settings" className="hover:text-orange-600">Settings</a>
                <span>/</span>
                <span className="font-medium text-orange-600">Company Management</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
                    <p className="text-gray-500 mt-1">Manage companies and tenants in your POS system</p>
                </div>
                <Button
                    onClick={() => { resetForm(); setShowForm(true) }}
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                </Button>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">
                            {editingCompany ? "Edit Company" : "Add New Company"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        name: e.target.value,
                                        slug: editingCompany ? formData.slug : generateSlug(e.target.value)
                                    })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug * (URL-friendly)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    pattern="[a-z0-9-]+"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                                    {editingCompany ? "Update" : "Create"} Company
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Assignment Modal */}
            {showUserModal && selectedCompany && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Manage Users</h2>
                                <p className="text-gray-500 text-sm">{selectedCompany.name}</p>
                            </div>
                            <button onClick={closeUserModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {userModalLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto space-y-6">
                                {/* Company Users */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-teal-600" />
                                        Assigned Users ({companyUsers.length})
                                    </h3>
                                    {companyUsers.length === 0 ? (
                                        <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">No users assigned to this company</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {companyUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between p-3 bg-teal-50 border border-teal-100 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{user.username}</p>
                                                        <p className="text-sm text-gray-500">{user.email} • {user.role}</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRemoveUser(user.id)}
                                                        className="text-red-600 hover:bg-red-50 border-red-200"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Unassigned Users */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <UserPlus className="h-4 w-4 text-orange-600" />
                                        Available Users ({unassignedUsers.length})
                                    </h3>
                                    {unassignedUsers.length === 0 ? (
                                        <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">All users are assigned to companies</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {unassignedUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{user.username}</p>
                                                        <p className="text-sm text-gray-500">{user.email} • {user.role}</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAssignUser(user.id)}
                                                        className="text-teal-600 hover:bg-teal-50 border-teal-200"
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Assign
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 mt-4">
                            <Button variant="outline" onClick={closeUserModal} className="w-full">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {showCredentialsModal && credentialsCompany && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Key className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Admin Credentials</h2>
                                    <p className="text-gray-500 text-sm">{credentialsCompany.name}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowCredentialsModal(false); setShowPassword(false) }} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Email */}
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-gray-900">{credentialsCompany.slug}@techsonance.co.in</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${credentialsCompany.slug}@techsonance.co.in`)
                                            toast.success("Email copied!")
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Username */}
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-gray-900">{credentialsCompany.slug}_admin</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${credentialsCompany.slug}_admin`)
                                            toast.success("Username copied!")
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-gray-900">
                                        {showPassword ? 'TechSonance1711!@#$' : '••••••••••••••••'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText('TechSonance1711!@#$')
                                                toast.success("Password copied!")
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Role */}
                            <div className="p-4 bg-teal-50 rounded-xl">
                                <label className="text-xs font-medium text-teal-600 uppercase tracking-wide">Role</label>
                                <div className="mt-1">
                                    <span className="font-semibold text-teal-700">Super Admin</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button variant="outline" onClick={() => { setShowCredentialsModal(false); setShowPassword(false) }} className="w-full">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Companies Grid */}
            {companies.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Companies Yet</h3>
                    <p className="text-gray-400 mb-6">Get started by adding your first company</p>
                    <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Company
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            className={`bg-white rounded-2xl border p-6 transition-all hover:shadow-lg ${company.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50/30'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <Building className="h-6 w-6 text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{company.name}</h3>
                                        <p className="text-sm text-gray-500">{company.slug}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleStatus(company)}
                                    className="text-gray-400 hover:text-gray-600"
                                    title={company.isActive ? "Deactivate" : "Activate"}
                                >
                                    {company.isActive ? (
                                        <ToggleRight className="h-6 w-6 text-green-500" />
                                    ) : (
                                        <ToggleLeft className="h-6 w-6 text-red-400" />
                                    )}
                                </button>
                            </div>

                            {company.address && (
                                <p className="text-sm text-gray-500 mb-3">{company.address}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-1">
                                    <Store className="h-4 w-4" />
                                    <span>{company._count.stores} stores</span>
                                </div>
                                <button
                                    onClick={() => openUserModal(company)}
                                    className="flex items-center gap-1 hover:text-teal-600 transition-colors"
                                >
                                    <Users className="h-4 w-4" />
                                    <span>{company._count.users} users</span>
                                </button>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => startEdit(company)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openUserModal(company)}
                                    className="text-teal-600 hover:bg-teal-50"
                                    title="Manage Users"
                                >
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setCredentialsCompany(company); setShowCredentialsModal(true) }}
                                    className="text-amber-600 hover:bg-amber-50"
                                    title="View Credentials"
                                >
                                    <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(company)}
                                    title="Delete Company"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
