'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, PlayCircle, ChefHat } from "lucide-react"
import { updateKitchenStatus, getActiveKitchenOrders } from "@/app/actions/kds"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface KDSBoardProps {
    initialOrders: any[]
}

export function KDSBoard({ initialOrders }: KDSBoardProps) {
    const [orders, setOrders] = useState(initialOrders)
    const [now, setNow] = useState(new Date())

    // Polling Effect
    useEffect(() => {
        const interval = setInterval(async () => {
            const res = await getActiveKitchenOrders()
            if (res.orders) setOrders(res.orders)
            setNow(new Date()) // Force re-render timers
        }, 15000) // 15 seconds

        // Timer ticker
        const timer = setInterval(() => setNow(new Date()), 1000)

        return () => {
            clearInterval(interval)
            clearInterval(timer)
        }
    }, [])

    const handleStatusUpdate = async (orderId: string, status: any) => {
        // Optimistic Update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, fulfillmentStatus: status } : o))

        if (status === 'SERVED') {
            // Remove after short delay
            setTimeout(() => {
                setOrders(prev => prev.filter(o => o.id !== orderId))
            }, 2000)
        }

        const res = await updateKitchenStatus(orderId, status)
        if (res.error) {
            toast.error("Failed to update status")
            // Revert? (Simple fetch next poll fixes it)
        }
    }

    const parseItems = (json: string) => {
        try {
            return JSON.parse(json)
        } catch (e) { return [] }
    }

    const getElapsedTime = (createdAt: Date) => {
        const diff = now.getTime() - new Date(createdAt).getTime()
        const mins = Math.floor(diff / 60000)
        return mins
    }

    const getTimerColor = (mins: number) => {
        if (mins < 10) return "text-green-400"
        if (mins < 20) return "text-yellow-400"
        return "text-red-500 animate-pulse"
    }

    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {orders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <ChefHat className="h-16 w-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-medium">Kitchen Clear</h3>
                        <p>No active orders</p>
                    </div>
                )}

                {orders.map((order) => {
                    const elapsed = getElapsedTime(order.createdAt)
                    const items = parseItems(order.items)
                    const status = order.fulfillmentStatus

                    return (
                        <Card key={order.id} className={`flex flex-col border-2 ${status === 'READY' ? 'border-green-500 bg-green-950/30' :
                                status === 'PREPARING' ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-800'
                            } text-slate-100 shadow-lg`}>
                            <CardHeader className="p-4 pb-2 border-b border-slate-700/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            #{order.kotNo}
                                            {status === 'READY' && <Badge className="bg-green-500 hover:bg-green-600">READY</Badge>}
                                        </CardTitle>
                                        <p className="text-sm text-slate-400">
                                            {order.tableName ? `Table: ${order.tableName}` : 'Takeaway'}
                                        </p>
                                    </div>
                                    <div className={`font-mono font-bold text-xl flex items-center gap-1 ${getTimerColor(elapsed)}`}>
                                        <Clock className="w-4 h-4" />
                                        {elapsed}m
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 flex-1">
                                <ul className="space-y-2">
                                    {items.map((item: any, i: number) => (
                                        <li key={i} className="flex justify-between items-start text-sm">
                                            <span className="font-medium flex gap-2">
                                                <span className="font-bold text-slate-300">{item.quantity}x</span>
                                                {item.name}
                                            </span>
                                            {/* Modifiers would go here */}
                                        </li>
                                    ))}
                                </ul>
                                {order.notes && (
                                    <div className="mt-4 p-2 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-200">
                                        Note: {order.notes}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="p-3 pt-0 grid grid-cols-2 gap-2">
                                {status === 'QUEUED' && (
                                    <Button
                                        className="w-full col-span-2 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                                    >
                                        <PlayCircle className="w-4 h-4 mr-2" /> Start Prep
                                    </Button>
                                )}
                                {status === 'PREPARING' && (
                                    <Button
                                        className="w-full col-span-2 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleStatusUpdate(order.id, 'READY')}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Ready
                                    </Button>
                                )}
                                {status === 'READY' && (
                                    <Button
                                        variant="secondary"
                                        className="w-full col-span-2 hover:bg-slate-700"
                                        onClick={() => handleStatusUpdate(order.id, 'SERVED')}
                                    >
                                        Mark Served (Clear)
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
