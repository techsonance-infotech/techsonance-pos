import { getAllLicenses, getStoresWithoutLicense } from "@/app/actions/license"
import { LicenseForm } from "@/components/admin/license-form"
import { Badge } from "@/components/ui/badge"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"

import { LicenseActions } from "@/components/admin/license-actions"

export default async function AdminLicensesPage() {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') {
        redirect('/dashboard')
    }

    const licenses = await getAllLicenses()
    const availableStores = await getStoresWithoutLicense()

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">License Management</h1>
                <p className="text-muted-foreground">Generate and manage software licenses for stores.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <LicenseForm stores={availableStores} />
                </div>

                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-medium">Active Licenses</h3>
                    <div className="rounded-md border bg-white">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Store</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Owner</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Devices</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Expires</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {licenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                                No licenses issued yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        licenses.map(license => {
                                            const owner = license.store.users[0]
                                            return (
                                                <tr key={license.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 align-middle font-medium">{license.store.name}</td>
                                                    <td className="p-4 align-middle text-muted-foreground">
                                                        {owner ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs">{owner.email}</span>
                                                                <span className="text-[10px] text-gray-400">{owner.username}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs italic">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <Badge variant="outline">{license.type}</Badge>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <Badge variant={license.status === 'ACTIVE' ? 'default' : 'destructive'}>
                                                            {license.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 align-middle text-center">
                                                        <span className="text-sm font-medium">
                                                            {license.devices?.length || 0} / {license.maxDevices}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        {license.validUntil ? new Date(license.validUntil).toLocaleDateString() : 'Never'}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <LicenseActions licenseId={license.id} isPerpetual={license.type === 'PERPETUAL'} status={license.status} />
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
