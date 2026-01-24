import { getSuppliers } from "@/app/actions/suppliers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Truck } from "lucide-react"
import Link from "next/link"

export default async function SuppliersPage() {
    const suppliers = await getSuppliers()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/inventory">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
                </div>
                <Link href="/dashboard/inventory/suppliers/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vendor List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ingredients</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Active POs</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {suppliers.map((s: any) => (
                                    <tr key={s.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            {s.name}
                                        </td>
                                        <td className="p-4 align-middle">{s.contactName || '-'}</td>
                                        <td className="p-4 align-middle">{s.phone}</td>
                                        <td className="p-4 align-middle">{s._count.ingredients}</td>
                                        <td className="p-4 align-middle">{s._count.purchaseOrders}</td>
                                    </tr>
                                ))}
                                {suppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                            No suppliers found. Add one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
