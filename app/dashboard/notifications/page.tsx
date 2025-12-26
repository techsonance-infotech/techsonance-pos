"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCheck, Filter, AlertTriangle, Info, CheckCircle, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getNotifications, markAllAsRead, markNotificationAsRead } from "@/app/actions/notifications"
import { toast } from "sonner"
import NotificationsLoading from "./loading"

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    useEffect(() => {
        loadData()
    }, [filter])

    async function loadData() {
        setLoading(true)
        const notes = await getNotifications(filter)
        setNotifications(notes)
        setLoading(false)
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        toast.success("All notifications marked as read")
    }

    const handleMarkRead = async (id: string) => {
        await markNotificationAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    }

    if (loading) {
        return <NotificationsLoading />
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.24))] gap-6">
            {/* Main Content */}
            <div className="flex-1 flex flex-col space-y-6 min-w-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500">Stay updated with your system alerts</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex gap-2">
                            <Button
                                variant={filter === 'all' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter('all')}
                                className={cn("transition-all", filter === 'all' ? "bg-white shadow-sm text-orange-600 font-bold hover:bg-white" : "text-gray-500")}
                            >
                                All
                            </Button>
                            <Button
                                variant={filter === 'unread' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter('unread')}
                                className={cn("transition-all", filter === 'unread' ? "bg-orange-50 text-orange-700 font-bold hover:bg-orange-100" : "text-gray-500")}
                            >
                                Unread
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2 text-gray-600 hover:text-orange-600">
                            <CheckCheck className="h-4 w-4" /> <span className="hidden sm:inline">Mark all read</span>
                        </Button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in-95">
                                <div className="h-24 w-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                                    <Bell className="h-10 w-10 text-gray-300 fill-current" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Notifications</h3>
                                <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
                                    You're all caught up! No new notifications at this time.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(note => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "p-6 flex gap-4 transition-all hover:bg-gray-50 cursor-pointer group",
                                            !note.isRead && "bg-orange-50/30 hover:bg-orange-50/50"
                                        )}
                                        onClick={() => !note.isRead && handleMarkRead(note.id)}
                                    >
                                        <div className={cn(
                                            "mt-1 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                            !note.isRead ? "bg-white text-orange-600 shadow-sm border border-orange-100" : "bg-gray-100/50 text-gray-400"
                                        )}>
                                            <Bell className={cn("h-5 w-5", !note.isRead && "fill-current")} />
                                        </div>
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <h4 className={cn("font-semibold text-gray-900 truncate pr-2", !note.isRead && "text-orange-900")}>{note.title}</h4>
                                                <span className="text-xs text-gray-400 whitespace-nowrap font-medium">
                                                    {new Date(note.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className={cn("text-sm leading-relaxed line-clamp-2", !note.isRead ? "text-gray-700 font-medium" : "text-gray-500")}>
                                                {note.message}
                                            </p>
                                        </div>
                                        {!note.isRead && (
                                            <div className="self-center">
                                                <div className="h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-orange-100" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Notification Types */}
            <div className="w-full lg:w-80 shrink-0">
                <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 sticky top-6">
                    <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-6">
                        <Info className="h-5 w-5" /> Notification Types
                    </h3>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-900 text-sm">Order Alerts</p>
                                <p className="text-xs text-blue-700/70 mt-1 leading-relaxed">Notifications when orders are completed, ready for pickup, or held.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-900 text-sm">Inventory Updates</p>
                                <p className="text-xs text-blue-700/70 mt-1 leading-relaxed">Get notified about low stock items and inventory adjustments.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-900 text-sm">System Messages</p>
                                <p className="text-xs text-blue-700/70 mt-1 leading-relaxed">Important server updates, maintenance alerts, and security notices.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-blue-100 mt-2">
                            <div className="h-5 w-5 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            </div>
                            <p className="text-xs text-blue-500 font-medium">More notification types coming soon...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
