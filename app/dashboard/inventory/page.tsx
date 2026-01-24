import { getInventoryItems } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { StockActionDialog } from "@/components/inventory/stock-action-dialog"

export default async function InventoryPage() {
    const items = await getInventoryItems()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
                <div className="flex items-center space-x-2">
                    <Link href="/dashboard/inventory/purchase-orders">
                        <Button variant="outline">
                            Purchase Orders
                        </Button>
                    </Link>
                    <Link href="/dashboard/inventory/suppliers">
                        <Button variant="outline">
                            Suppliers
                        </Button>
                    </Link>
                    <Link href="/dashboard/inventory/history">
                        <Button variant="outline">
                            View History
                        </Button>
                    </Link>
                    <Link href="/dashboard/inventory/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Ingredient
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{items.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {items.filter((i: any) => i.status === 'LOW_STOCK').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Stock Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unit</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Current Stock</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cost Price</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {items.map((item: any) => (
                                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{item.name}</td>
                                        <td className="p-4 align-middle">{item.unit}</td>
                                        <td className="p-4 align-middle">{item.currentStock}</td>
                                        <td className="p-4 align-middle">₹{item.costPrice}</td>
                                        <td className="p-4 align-middle">
                                            {item.status === 'LOW_STOCK' ? (
                                                <span className="inline-flex items-center rounded-full border border-red-500 px-2.5 py-0.5 text-xs font-semibold text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <StockActionDialog
                                                ingredientId={item.id}
                                                ingredientName={item.name}
                                                currentStock={item.currentStock}
                                                unit={item.unit}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                            No ingredients found. Add one to get started.
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
