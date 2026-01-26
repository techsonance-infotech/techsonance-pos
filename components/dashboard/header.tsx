"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Bell, Search, MapPin, LogOut, Settings, Check, CheckCheck, Filter, Clock, LayoutGrid, Receipt, Loader2 } from "lucide-react"
import { getUserProfile } from "@/app/actions/user"
import { getNotifications, markNotificationAsRead, markAllAsRead } from "@/app/actions/notifications"
import { logout } from "@/app/actions/logout"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { useSync } from "@/components/providers/sync-provider"

type Notification = {
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: Date
}

import { getHeldOrdersCount, searchOrders } from "@/app/actions/orders"

export function Header({ initialUser }: { initialUser: any | null }) {
    const [user, setUser] = useState(initialUser)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [unreadOnly, setUnreadOnly] = useState(false)

    // Offline/Sync State
    const isOnline = useNetworkStatus()
    const { isSyncing, pendingCount, syncNow } = useSync()


    // Sync with server prop (Revalidation fix)
    useEffect(() => {
        if (initialUser) {
            setUser(initialUser)
        }
    }, [initialUser])

    // Load User Data (Fallback if no initialUser)
    useEffect(() => {
        if (!user && !initialUser) {
            async function loadData() {
                const profile = await getUserProfile()
                if (profile) {
                    setUser(profile)
                }
            }
            loadData()
        }
    }, [user, initialUser])

    // Load Notifications (with throttling to prevent spam)
    useEffect(() => {
        async function fetchNotes() {
            const CACHE_KEY = 'last_notification_fetch'
            const cachedTime = sessionStorage.getItem(CACHE_KEY)
            const now = Date.now()

            // If user explicitly opened notifications popup, always fetch fresh data
            // Otherwise, throttle background fetches to once per 10 seconds
            if (!showNotifications && cachedTime && (now - Number(cachedTime) < 10000)) {
                console.log('[Header] Skipping notification fetch (throttled)')
                return
            }

            console.log('[Header] Fetching notifications...')
            sessionStorage.setItem(CACHE_KEY, now.toString())
            const notes = await getNotifications(unreadOnly ? 'unread' : 'all')
            setNotifications(notes)
        }
        fetchNotes()
    }, [unreadOnly, showNotifications])

    // Held Orders Count
    const [heldCount, setHeldCount] = useState(0)

    useEffect(() => {
        async function loadHeldCount() {
            const count = await getHeldOrdersCount()
            setHeldCount(count)
        }
        loadHeldCount()

        // Listen for custom event to refresh count
        const handleHoldOrderUpdate = () => {
            loadHeldCount()
        }

        window.addEventListener('holdOrderUpdated', handleHoldOrderUpdate)

        return () => {
            window.removeEventListener('holdOrderUpdated', handleHoldOrderUpdate)
        }
    }, [])

    const unreadCount = notifications.filter(n => !n.isRead).length // Client-side calculation for Badge

    const handleMarkRead = async (id: string) => {
        await markNotificationAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }

    const logoutAction = async () => {
        await logout()
    }

    // Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true)
                const results = await searchOrders(searchQuery)
                setSearchResults(results)
                setIsSearching(false)
                setShowResults(true)
            } else {
                setSearchResults([])
                setShowResults(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = () => setShowResults(false)
        window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [])

    return (
        <header className="flex h-20 items-center justify-between bg-white px-8 shadow-sm z-50 relative transition-colors print:hidden">
            {/* Left: Outlet Selector */}
            <div className="flex items-center gap-4">
                {/* Store Display - Visible to all, but link disabled if module restricted */}
                <div className={cn(
                    "flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full transition-all shadow-sm",
                    (!user?.disabledModules?.includes('stores') || user?.role === 'MANAGER' || user?.role === 'BUSINESS_OWNER' || user?.role === 'SUPER_ADMIN') ? "cursor-pointer hover:bg-gray-50 hover:border-gray-300" : "cursor-default opacity-80"
                )}
                    onClick={() => {
                        if (!user?.disabledModules?.includes('stores') || user?.role === 'MANAGER' || user?.role === 'BUSINESS_OWNER' || user?.role === 'SUPER_ADMIN') {
                            window.location.href = "/dashboard/stores"
                        }
                    }}
                >
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">{user?.defaultStore?.name || "Select Store"}</span>
                </div>

                {/* Network & Sync Status */}
                {!isOnline ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 ring-2 ring-red-50 text-red-700 rounded-full text-xs font-bold animate-pulse" title="System Offline">
                        <WifiOff className="h-3 w-3" />
                        <span>Offline Mode</span>
                    </div>
                ) : isSyncing ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 ring-2 ring-blue-50 text-blue-700 rounded-full text-xs font-bold transition-all" title="Syncing Data">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Syncing{pendingCount > 0 ? ` ${pendingCount} Orders` : '...'}</span>
                    </div>
                ) : pendingCount > 0 ? (
                    <button
                        onClick={() => syncNow()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 ring-2 ring-amber-50 text-amber-900 rounded-full text-xs font-bold hover:bg-amber-200 transition-all shadow-sm animate-bounce cursor-pointer"
                        title="Click to sync pending orders manually"
                    >
                        <RefreshCw className="h-3 w-3" />
                        <span>{pendingCount} Saved Locally</span>
                    </button>
                ) : (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold opacity-60 hover:opacity-100 transition-opacity cursor-default" title="System Online & Synced">
                        <Wifi className="h-3 w-3" />
                        <span>Online</span>
                    </div>
                )}
            </div>

            {/* Center: Search Bar (Big) */}
            <div className="flex flex-1 items-center justify-center px-8 z-50">
                <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                    {isSearching ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500 animate-spin" />
                    ) : (
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    )}
                    <Input
                        placeholder="Search by KOT No / Bill No..."
                        className="pl-12 h-12 text-base bg-white border-gray-200 rounded-full focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (searchQuery.length >= 2) setShowResults(true)
                        }}
                    />

                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            {isSearching ? (
                                <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                                    <span className="text-xs">Searching orders...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {searchResults.map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => {
                                                window.location.href = `/dashboard/recent-orders?viewOrderId=${order.id}`
                                            }}
                                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center",
                                                    order.status === 'COMPLETED' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                                                )}>
                                                    <Receipt className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                                        {order.kotNo}
                                                        {order.customerName && <span className="text-gray-500 font-normal"> • {order.customerName}</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(order.createdAt).toLocaleString()} • {order.tableName || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">₹{order.totalAmount}</p>
                                                <p className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider",
                                                    order.status === 'COMPLETED' ? "text-green-600" : "text-orange-600"
                                                )}>
                                                    {order.status}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-gray-400 text-sm">No orders found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Tables Icon - Only show if Table Mode is enabled AND module is active */}
                {user?.defaultStore?.tableMode && (!user?.disabledModules?.includes('tables')) && (
                    <a
                        href="/dashboard/tables"
                        className="p-2.5 rounded-xl text-gray-500 transition-all hover:bg-gray-50 hover:shadow-sm hover:text-orange-600 group"
                        title="Tables"
                    >
                        <LayoutGrid className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </a>
                )}

                {/* Hold Orders Icon */}
                {(!user?.disabledModules?.includes('orders')) && (
                    <button
                        onClick={() => window.location.href = '/dashboard/hold-orders'}
                        className="relative p-2.5 rounded-xl text-gray-500 transition-all hover:bg-gray-50 hover:shadow-sm hover:text-orange-600 group"
                        title="Hold Orders"
                    >
                        <Clock className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        {heldCount > 0 && (
                            <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-in zoom-in">
                                {heldCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Notification Bell - Hidden for USER and CASHIER roles */}
                {(!['USER', 'CASHIER'].includes(user?.role)) && (
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={cn(
                                "p-2.5 rounded-xl text-gray-500 transition-all hover:bg-gray-50 hover:shadow-sm",
                                showNotifications ? "bg-orange-50 text-orange-600" : "hover:bg-gray-50"
                            )}
                        >
                            <Bell className="h-6 w-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                            )}
                        </button>

                        {/* Notification Popup */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-4 w-96 origin-top-right rounded-2xl bg-white dark:bg-stone-900 shadow-xl border border-gray-100 dark:border-stone-800 focus:outline-none z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-4 border-b border-gray-100 dark:border-stone-800 flex items-center justify-between bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setUnreadOnly(!unreadOnly)}
                                            className={cn(
                                                "p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                                unreadOnly ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-100"
                                            )}
                                            title="Filter Unread"
                                        >
                                            <Filter className="h-3 w-3" /> Unread
                                        </button>
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <p className="text-sm">No notifications found</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y dark:divide-stone-800">
                                            {notifications.map(note => (
                                                <div
                                                    key={note.id}
                                                    className={cn(
                                                        "p-4 hover:bg-gray-50 dark:hover:bg-stone-800/50 transition-colors flex gap-3 group relative cursor-pointer",
                                                        !note.isRead && "bg-orange-50/30 dark:bg-orange-900/5"
                                                    )}
                                                    onClick={() => handleMarkRead(note.id)}
                                                >
                                                    <div className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0", !note.isRead ? "bg-orange-500" : "bg-gray-300 dark:bg-stone-700")} />
                                                    <div className="flex-1 space-y-1">
                                                        <p className={cn("text-sm font-semibold", !note.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400")}>
                                                            {note.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                            {note.message}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {new Date(note.createdAt).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                    {!note.isRead && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMarkRead(note.id); }}
                                                            className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-1 text-gray-400 hover:text-orange-600 transition-all"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile Dropdown */}
                <div className="relative group pl-6 border-l border-gray-100 dark:border-stone-800">
                    <button className="flex items-center gap-3 cursor-pointer outline-none">
                        <div className="h-11 w-11 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-700 dark:text-orange-500 font-bold text-lg ring-4 ring-orange-50 dark:ring-stone-800 group-hover:ring-orange-100 transition-all shadow-sm">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user?.username || 'Loading...'}</p>
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-500">{user?.role || '...'}</p>
                        </div>
                    </button>

                    {/* Styled Dropdown (No borders, soft shadow) */}
                    <div className="absolute right-0 top-full mt-4 w-56 origin-top-right rounded-2xl bg-white dark:bg-stone-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 invisible group-focus-within:visible opacity-0 group-focus-within:opacity-100 transition-all duration-200 z-40 transform translate-y-2 group-focus-within:translate-y-0">
                        <div className="p-2 space-y-1">
                            <div className="px-4 py-3 mb-2 bg-gray-50 dark:bg-stone-800/50 rounded-xl">
                                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{user?.username}</p>
                                <p className="text-xs text-stone-500 font-medium">{user?.role}</p>
                            </div>

                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'BUSINESS_OWNER' || user?.role === 'MANAGER') && (
                                <a href="/dashboard/settings" className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors">
                                    <Settings className="mr-3 h-4 w-4 text-gray-400 group-hover:text-orange-500" /> Settings
                                </a>
                            )}

                            <div className="h-px bg-gray-100 dark:bg-stone-800 my-1 mx-2" />

                            <button
                                onClick={async () => {
                                    sessionStorage.removeItem('pin_verified')
                                    await logout()
                                }}
                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <LogOut className="mr-3 h-4 w-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
