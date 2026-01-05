'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { getPOSInitialData } from '@/app/actions/pos'
import { getUserProfile } from '@/app/actions/user'
import { db, LocalSettings, LocalCategory, LocalProduct } from '@/lib/db'
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

            console.log("Bootstrap Sync Complete")
            setIsBootstrapped(true)
            toast.success("Offline Data Ready", { icon: "✅" })
        } catch (error) {
            console.error("Bootstrap Sync Failed:", error)
            toast.error("Failed to sync offline data")
        } finally {
            setIsSyncing(false) // Reset syncing state
        }
    }

    // Initial sync on mount and re-sync when coming online
    useEffect(() => {
        if (isOnline) {
            syncData()
        }
    }, [isOnline])

    return (
        <BootstrapContext.Provider value={{ isBootstrapped, isSyncing, forceSync: syncData }}>
            {children}
        </BootstrapContext.Provider>
    )
}
