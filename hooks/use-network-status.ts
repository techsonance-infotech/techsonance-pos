'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        // Set initial status
        setIsOnline(navigator.onLine)

        const handleOnline = () => {
            setIsOnline(true)
            toast.success("Back Online", {
                description: "Syncing data...",
                icon: "🟢"
            })
        }

        const handleOffline = () => {
            setIsOnline(false)
            toast.warning("You are Offline", {
                description: "Changes will be saved locally.",
                icon: "🔴"
            })
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}
