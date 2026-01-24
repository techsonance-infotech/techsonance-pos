import { getPurchaseOrders } from "@/app/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ArrowLeft, Plus, ShoppingBag } from "lucide-react"
import Link from "next/link"

export default async function PurchaseOrdersPage() {
    const pos = await getPurchaseOrders()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/inventory">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
                </div>
                <Link href="/dashboard/inventory/purchase-orders/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create PO
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Orders List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PO #</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Supplier</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Items</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {pos.map((po: any) => (
                                    <tr key={po.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium flex items-center gap-2">
                                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                            {po.poNumber}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {format(new Date(po.createdAt), "dd MMM yyyy")}
                                        </td>
                                        <td className="p-4 align-middle">{po.supplier.name}</td>
                                        <td className="p-4 align-middle">{po._count.items}</td>
                                        <td className="p-4 align-middle font-medium">₹{po.totalAmount}</td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${po.status === 'COMPLETED'
                                                    ? 'border-green-500 text-green-500'
                                                    : 'border-orange-500 text-orange-500' // SENT
                                                }`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <Link href={`/dashboard/inventory/purchase-orders/${po.id}`}>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {pos.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                            No orders found. Create one now.
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
