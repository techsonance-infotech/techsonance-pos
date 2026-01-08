'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { getPOSInitialData } from '@/app/actions/pos'
import { getUserProfile } from '@/app/actions/user'
import { getRecentOrders, getHeldOrders } from '@/app/actions/orders'
import { getTables } from '@/app/actions/tables'
import { db, LocalSettings, LocalCategory, LocalProduct, LocalOrder, LocalTable } from '@/lib/db'
import { getPOSService } from '@/lib/pos-service'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { toast } from 'sonner'

interface BootstrapContextType {
    isBootstrapped: boolean
    isSyncing: boolean
    forceSync: () => Promise<void>
}

const BootstrapContext = createContext<BootstrapContextType>({
    isBootstrapped: false,
    isSyncing: false,
    forceSync: async () => { }
})

export const useBootstrap = () => useContext(BootstrapContext)

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
    const isOnline = useNetworkStatus()
    const [isBootstrapped, setIsBootstrapped] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false) // Keep this for now, as the context still expects it. The new sync logic doesn't explicitly set it.

    // Define syncData outside useEffect so it can be used by forceSync
    const syncData = async () => {
        setIsSyncing(true) // Set syncing state
        try {
            // If offline and we have data, skip (using local cache)
            // Actually BootstrapProvider is for FETCHING valid data from server
            // and putting it into LocalDB (Sync Down)

            if (!isOnline) {
                console.log("Offline, skipping bootstrap sync.")
                return
            }

            console.log("Starting POS Data Bootstrap...")

            const user = await getUserProfile()
            if (!user || !user.defaultStoreId) {
                console.log("User or default store ID not found, skipping bootstrap sync.")
                return
            }

            const posService = getPOSService()

            const data = await getPOSInitialData()
            if (!data) {
                console.log("No initial POS data received, skipping bootstrap sync.")
                return
            }

            // 2. Sync Settings
            const settings: LocalSettings[] = []
            if (data.storeDetails.license) {
                settings.push({ key: 'licenseKey', value: data.storeDetails.license.key })
            }
            settings.push({ key: 'storeName', value: data.storeDetails.name })
            settings.push({ key: 'storeAddress', value: data.storeDetails.location || '' })

            // Business settings conversion (Assuming businessDetails is the array of settings)
            if (Array.isArray(data.businessDetails)) {
                for (const s of data.businessDetails) {
                    settings.push({ key: `setting_${s.key}`, value: s.value })
                }
            }

            await posService.saveSettingsBulk(settings)

            // 3. Sync Categories
            const categories: LocalCategory[] = data.categories.map((c: any) => ({
                id: c.id,
                name: c.name,
                image: c.image || undefined,
                sortOrder: c.sortOrder
            }))
            await posService.saveCategoriesBulk(categories)

            // 4. Sync Products
            const products: LocalProduct[] = []
            for (const c of data.categories) {
                // Determine category products (data.products contains all, but nested loop implies structure)
                // Actually app/actions/pos.ts returns flat products array in data.products
                // But previously I looped data.categories? No, data.categories[i].products.
                // Let's check pos.ts return again. It returns `categories` and `products`. 
                // `getCategories` return might include products property? 
                // Ah, line 31 of pos.ts maps `products`. So it is a top level array.
                // But my previous code tried to loop `c.products`.

                // Let's use the flat `data.products` array which is safer if structure changed.
                // But I need to filter by category or just iterate all.
            }

            // Rewrite using data.products flat array
            for (const p of data.products) {
                products.push({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    description: p.description || undefined,
                    image: p.image || undefined,
                    categoryId: p.categoryId,
                    sortOrder: p.sortOrder,
                    isAvailable: p.isAvailable,
                    addons: p.addons ? p.addons.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        price: a.price
                    })) : []
                })
            }
            await posService.saveProductsBulk(products)

            // 5. Sync Tables
            try {
                const serverTables = await getTables()
                if (serverTables && serverTables.length > 0) {
                    const tables: LocalTable[] = serverTables.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        capacity: t.capacity,
                        status: t.status,
                        orderId: t.orderId
                    }))
                    await posService.saveTablesBulk(tables)
                    console.log(`Cached ${tables.length} tables`)
                }
            } catch (e) {
                console.error("Tables sync failed:", e)
            }

            // 6. Sync Recent Orders (for offline viewing)
            try {
                const serverRecent = await getRecentOrders()
                if (serverRecent && serverRecent.length > 0) {
                    const orders: LocalOrder[] = serverRecent.map((o: any) => ({
                        id: o.id,
                        kotNo: o.kotNo,
                        items: o.items,
                        totalAmount: o.totalAmount,
                        paymentMode: o.paymentMode || 'CASH',
                        customerName: o.customerName,
                        customerMobile: o.customerMobile,
                        tableId: o.tableId,
                        tableName: o.tableName,
                        createdAt: new Date(o.createdAt).getTime(),
                        status: 'SYNCED',
                        originalStatus: 'COMPLETED'
                    }))
                    await posService.saveOrdersBulk(orders)
                    console.log(`Cached ${orders.length} recent orders`)
                }
            } catch (e) {
                console.error("Recent orders sync failed:", e)
            }

            // 7. Sync Held Orders (for offline KOT viewing)
            try {
                const serverHeld = await getHeldOrders()
                if (serverHeld && serverHeld.length > 0) {
                    const orders: LocalOrder[] = serverHeld.map((o: any) => ({
                        id: o.id,
                        kotNo: o.kotNo,
                        items: o.items,
                        totalAmount: o.totalAmount,
                        paymentMode: o.paymentMode || 'CASH',
                        customerName: o.customerName,
                        customerMobile: o.customerMobile,
                        tableId: o.tableId,
                        tableName: o.tableName,
                        createdAt: new Date(o.createdAt).getTime(),
                        status: 'SYNCED',
                        originalStatus: 'HELD'
                    }))
                    await posService.saveOrdersBulk(orders)
                    console.log(`Cached ${orders.length} held orders`)
                }
            } catch (e) {
                console.error("Held orders sync failed:", e)
            }

            console.log("Bootstrap Sync Complete")
            setIsBootstrapped(true)
            toast.success("Offline Data Ready", { icon: "✅" })
        } catch (error) {
            // Check if it's a network error (offline)
            const isNetworkError = error instanceof TypeError && error.message.includes('Failed to fetch')

            if (isNetworkError) {
                console.warn("Bootstrap Sync skipped: Network unavailable (Failed to fetch)")
                // Do not show error toast for offline scenarios
            } else {
                console.error("Bootstrap Sync Failed:", error)
                toast.error("Failed to sync offline data")
            }
        } finally {
            setIsSyncing(false) // Reset syncing state
        }
    }

    // Initial sync on mount and re-sync when coming online
    useEffect(() => {
        if (isOnline) {
            syncData()

            // Show toast only if we were previously offline (simple check via non-initial render? 
            // Actually simpler to just show "Back Online" if it flips to true, but we need to track previous state.
            // For now, let's just use the fact that this effect runs on change.)
            // But we don't want to show it on initial mount if already online.
            // We can leave "Back Online" to the sync success toast usually?
            // User requested "You are Offline" toast removal of duplicates.
            // Let's add the "You are Offline" toast here when isOnline becomes false.
        }
    }, [isOnline])

    // Global Network Status Toasts
    useEffect(() => {
        const handleOffline = () => {
            toast.warning("You are Offline", {
                description: "Changes will be saved locally.",
                icon: "🔴",
                id: 'offline-toast' // Prevent duplicates even if called multiple times
            })
        }

        const handleOnline = () => {
            // Optional: Dismiss offline toast
            toast.dismiss('offline-toast')
            toast.success("Back Online", {
                description: "Syncing data...",
                icon: "🟢",
                id: 'online-toast'
            })
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    return (
        <BootstrapContext.Provider value={{ isBootstrapped, isSyncing, forceSync: syncData }}>
            {children}
        </BootstrapContext.Provider>
    )
}
