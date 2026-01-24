"use client"

import { useEffect, useState } from "react"
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
    LayoutGrid,
    Key,
    Users,
    BarChart3,
    MessageSquare,
    LifeBuoy,
    Box,
    Sparkles
} from "lucide-react"

const baseSidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER'] },
    { icon: LayoutGrid, label: "Tables", href: "/dashboard/tables", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: ShoppingCart, label: "New Order", href: "/dashboard/new-order", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: Clock, label: "Recent Orders", href: "/dashboard/recent-orders", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: PauseCircle, label: "Hold Orders", href: "/dashboard/hold-orders", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: Menu, label: "Menu Management", href: "/dashboard/menu", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'] },
    { icon: Box, label: "Inventory", href: "/dashboard/inventory", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'] },
    { icon: Store, label: "Stores", href: "/dashboard/stores", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER'] },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'] },
    // AI Insights - Manager+
    { icon: Sparkles, label: "AI Insights", href: "/dashboard/ai-insights", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'] },
    // Admin / Audit
    // Admin / Audit (Removed)
    // { icon: Key, label: "Admin Panel", href: "/dashboard/admin/users", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER'] },

    { icon: LifeBuoy, label: "Help & Support", href: "/dashboard/support", roles: ['BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'CASHIER', 'USER'] },
    { icon: Settings, label: "Settings", href: "/dashboard/settings", roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER'] },
]

const EMPTY_MODULES: string[] = []

// Added storeTableMode, businessName, logoUrl to props
export function Sidebar({ userRole, disabledModules, storeTableMode = true, businessName = "", logoUrl }: { userRole?: string, disabledModules?: string[], storeTableMode?: boolean, businessName?: string, logoUrl?: string }) {
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()
    const [items, setItems] = useState(baseSidebarItems)

    // Module Mapping (Sidebar Item Label or Href Segment -> Module ID)
    const getModuleId = (item: any): string | null => {
        if (item.href.includes('new-order') || item.href.includes('recent-orders') || item.href.includes('hold-orders')) return 'orders'
        if (item.href.includes('tables')) return 'tables'
        if (item.href.includes('menu')) return 'menu'
        if (item.href.includes('stores')) return 'stores'
        if (item.href.includes('notifications')) return 'notifications'
        return null
    }

    const [effectiveRole, setEffectiveRole] = useState(userRole)

    // Hydrate Role from Offline Cache if needed
    useEffect(() => {
        if (!userRole || userRole === 'OFFLINE_ACCESS') {
            const loadCachedProfile = async () => {
                try {
                    const { getPOSService } = await import("@/lib/pos-service")
                    const settings = await getPOSService().getSettings()
                    const profile = settings.find(s => s.key === 'user_profile')?.value
                    if (profile && profile.role) {
                        console.log("Hydrated offline role:", profile.role)
                        setEffectiveRole(profile.role)
                    }
                } catch (e) {
                    console.error("Failed to hydrate offline profile", e)
                }
            }
            loadCachedProfile()
        } else {
            setEffectiveRole(userRole)
        }
    }, [userRole])

    useEffect(() => {
        // Filter items based on user role AND disabled modules
        const filteredItems = baseSidebarItems.filter(item => {
            // 1. Module Based Blocking for "User" / "Manager"
            // Exempt MANAGER from module checks to ensure they always have access as requested
            if (effectiveRole === 'MANAGER') {
                return true
            }

            // If the user has explicitly disabled this module, hide it
            const moduleId = getModuleId(item)
            if (moduleId && disabledModules && disabledModules.includes(moduleId)) {
                return false
            }

            // 2. Strict Role Checks
            // Existing 'roles' array check
            if ('roles' in item && item.roles) {
                if (!effectiveRole || !item.roles.includes(effectiveRole)) return false
            }

            // 3. Special Case: Analytics
            // Only visible to SUPER_ADMIN and BUSINESS_OWNER
            if (item.href.includes('analytics')) {
                if (effectiveRole !== 'SUPER_ADMIN' && effectiveRole !== 'BUSINESS_OWNER' && effectiveRole !== 'MANAGER') {
                    return false
                }
            }

            // 4. Store Mode Check (Hide Tables in Counter Mode)
            if (item.href.includes('tables') && !storeTableMode) {
                return false
            }

            // Otherwise, show the item
            return true
        })
        setItems(filteredItems)
    }, [effectiveRole, disabledModules, storeTableMode])

    // ... (existing logic)

    return (
        <aside
            className={cn(
                "relative flex flex-col bg-white transition-all duration-300 ease-in-out shadow-xl z-10 overflow-hidden print:hidden",
                collapsed ? "w-20" : "w-72"
            )}
        >
            <div className="flex h-20 items-center justify-between px-6 min-w-max">
                <div className={cn(
                    "flex items-center gap-3 transition-all duration-300 overflow-hidden",
                    collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                )}>
                    {logoUrl && (
                        <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain shrink-0" />
                    )}
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent truncate max-w-[150px]" title={businessName}>
                        {businessName}
                    </span>
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors ml-auto"
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-hide">
                {items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden",
                                isActive
                                    ? "bg-orange-50 text-orange-600 shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                                collapsed && "justify-center px-2"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", isActive && "text-orange-600 scale-110")} />
                            <span className={cn(
                                "transition-all duration-300",
                                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className={cn(
                                    "ml-auto w-1.5 h-1.5 bg-orange-600 rounded-full shrink-0 transition-all duration-300",
                                    collapsed ? "opacity-0 w-0" : "opacity-100"
                                )} />
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-gray-200 px-4 py-4">
                <button
                    onClick={async () => {
                        sessionStorage.removeItem('pin_verified')
                        await logout()
                    }}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-2xl p-3 text-sm font-medium transition-all duration-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:shadow-sm group overflow-hidden whitespace-nowrap",
                        collapsed && "justify-center"
                    )}
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    <span className={cn(
                        "transition-all duration-300",
                        collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    )}>
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    )
}
