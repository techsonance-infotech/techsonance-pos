"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/app/actions/logout"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    ShoppingCart,
    Clock,
    PauseCircle,
    Menu,
    Store,
    Bell,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    LayoutGrid
} from "lucide-react"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: LayoutGrid, label: "Tables", href: "/dashboard/tables" },
    { icon: ShoppingCart, label: "New Order", href: "/dashboard/new-order" },
    { icon: Clock, label: "Recent Orders", href: "/dashboard/recent-orders" },
    { icon: PauseCircle, label: "Hold Orders", href: "/dashboard/hold-orders" },
    { icon: Menu, label: "Menu Management", href: "/dashboard/menu" },
    { icon: Store, label: "Stores", href: "/dashboard/stores" },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
    { icon: Settings, label: "More Options", href: "/dashboard/settings" },
]

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()

    return (
        <aside
            className={cn(
                "relative flex flex-col bg-white transition-all duration-300 shadow-xl z-10",
                collapsed ? "w-20" : "w-72"
            )}
        >
            <div className="flex h-20 items-center justify-between px-6">
                {!collapsed && (
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                        CafePOS
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-orange-50 text-orange-600 shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                                collapsed && "justify-center px-2"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "text-orange-600 scale-110")} />
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 bg-orange-600 rounded-full" />}
                        </Link>
                    )
                })}
            </nav>

            <div className="absolute bottom-8 w-full px-4">
                <button
                    onClick={async () => {
                        sessionStorage.removeItem('pin_verified')
                        await logout()
                    }}
                    className={`
                            flex w-full items-center gap-3 rounded-2xl p-3 text-sm font-medium transition-all duration-300
                            text-gray-500 hover:bg-red-50 hover:text-red-600 hover:shadow-sm group
                        `}
                >
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    <span className={`transition-opacity duration-300 ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>Logout</span>
                </button>
            </div>
        </aside>
    )
}
