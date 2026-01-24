import { getPurchaseOrderDetails, receivePurchaseOrder } from "@/app/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ArrowLeft, CheckCircle2, ClipboardCheck, Truck } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function PurchaseOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const po = await getPurchaseOrderDetails(id)

    if (!po) {
        notFound()
    }

    // Function to handle receiving order (server action call via form)
    // We use a simple form for the action button since it's a server component
    // In a real app we might want a client component for better pending states, 
    // but this works for MVP.

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/inventory/purchase-orders">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{po.poNumber}</h2>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Truck className="h-4 w-4" /> {po.supplier.name}
                            <span className="text-gray-300">|</span>
                            Created by {po.createdBy.username} on {format(new Date(po.createdAt), "dd MMM yyyy")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${po.status === 'COMPLETED'
                        ? 'border-green-500 text-green-500'
                        : 'border-orange-500 text-orange-500'
                        }`}>
                        {po.status}
                    </span>

                    {po.status !== 'COMPLETED' && (
                        <form action={async () => {
                            'use server'
                            await receivePurchaseOrder(po.id)
                        }}>
                            <Button type="submit" className="gap-2 bg-green-600 hover:bg-green-700">
                                <ClipboardCheck className="h-4 w-4" /> Receive Order
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Items Ordered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Item</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ordered Qty</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unit Ratio</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Received</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {po.items.map((item: any) => (
                                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">{item.ingredientName}</td>
                                            <td className="p-4 align-middle">{item.orderedQty}</td>
                                            <td className="p-4 align-middle text-muted-foreground text-xs">x 1</td>
                                            <td className="p-4 align-middle">
                                                {po.status === 'COMPLETED' ? (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> {item.receivedQty}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-right">₹{item.totalPrice}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-muted/50 font-bold">
                                        <td colSpan={4} className="p-4 text-right">Total</td>
                                        <td className="p-4 text-right">₹{po.totalAmount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="relative border-l border-gray-200 ml-3">
                            <li className="mb-10 ml-6">
                                <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${po.status === 'SENT' || po.status === 'COMPLETED' ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                    <Truck className="w-3 h-3 text-white" />
                                </span>
                                <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">Order Sent</h3>
                                <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                    {format(new Date(po.createdAt), "PPP p")}
                                </time>
                                <p className="mb-4 text-base font-normal text-gray-500">
                                    Order placed with {po.supplier.name} for {po.items.length} items.
                                </p>
                            </li>
                            <li className="ml-6">
                                <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${po.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-200'}`}>
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </span>
                                <h3 className="mb-1 text-lg font-semibold text-gray-900">Goods Received</h3>
                                {po.status === 'COMPLETED' && po.receivedDate ? (
                                    <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                        {format(new Date(po.receivedDate), "PPP p")}
                                    </time>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">Pending delivery...</span>
                                )}
                            </li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
