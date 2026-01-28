'use client'

import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { db, LocalOrder } from '@/lib/db' // Still used? Helper hooks maybe? Accessing raw might be needed or useless. POSService abstracts it.
// Actually POSService abstracts it. I can remove db import if no other usage.
// Checking file... uses useLiveQuery?
import { getPOSService } from '@/lib/pos-service'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { toast } from 'sonner'
import { useBootstrap } from './bootstrap-provider'

interface SyncContextType {
    isSyncing: boolean
    pendingCount: number
    lastSyncTime: Date | null
    syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextType>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncNow: async () => { }
})

export const useSync = () => useContext(SyncContext)

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const isOnline = useNetworkStatus()
    const [isSyncing, setIsSyncing] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
    const { forceSync } = useBootstrap()

    // Check for pending orders
    const checkPending = useCallback(async () => {
        try {
            const posService = getPOSService()
            const orders = await posService.getPendingOrders()
            // Fix: handle undefined/null return from IPC if handler fails or returns null
            const count = orders?.length || 0
            setPendingCount(count)
            return count
        } catch (e) {
            console.error(e)
            return 0
        }
    }, [])

    const syncNow = useCallback(async () => {
        if (!isOnline || isSyncing) return

        const posService = getPOSService()
        // Double check count before starting UI
        const pending = await posService.getPendingOrders()
        if (pending.length === 0) {
            setPendingCount(0)
            return
        }

        setIsSyncing(true)
        const toastId = toast.loading(`Syncing ${pending.length} offline orders...`, { id: 'sync-toast' })

        try {
            // Send to API (Batch)
            const res = await fetch('/api/sync/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: pending })
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || "Sync failed")
            }

            // Mark as Synced in Local DB
            await posService.markOrdersSynced(result.syncedIds)

            toast.success(`Synced ${result.syncedIds.length} orders successfully`, { id: toastId })

            // Trigger bi-directional sync (Pull latest data from server)
            console.log("Triggering post-sync refresh...")
            await forceSync()

            if (result.failedIds.length > 0) {
                toast.error(`Failed to sync ${result.failedIds.length} orders`, { id: 'sync-failed-toast' })
            }

            setLastSyncTime(new Date())
            checkPending() // Re-check count

        } catch (error) {
            console.error("Sync failed", error)
            toast.error("Sync failed. Will retry later.", { id: toastId })
        } finally {
            setIsSyncing(false)
        }
    }, [isOnline, isSyncing, checkPending, forceSync])

    // Monitor DB for changes (Polling for now, strictly Dexie `useLiveQuery` is better but this works)
    useEffect(() => {
        // Check pending count every few seconds or use Dexie hook if strictly react
        const interval = setInterval(checkPending, 5000)
        return () => clearInterval(interval)
    }, [checkPending])

    // Auto-sync when coming online or when count > 0 detected
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            // Debounce slightly to allow connection to stabilize
            const timer = setTimeout(() => {
                syncNow()
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isOnline, pendingCount, isSyncing, syncNow])

    return (
        <SyncContext.Provider value={{ isSyncing, pendingCount, lastSyncTime, syncNow }}>
            {children}
        </SyncContext.Provider>
    )
}
