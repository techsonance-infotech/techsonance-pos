"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

export function VersionChecker() {
    // Use ref instead of state to avoid re-running the effect
    const clientVersionRef = useRef<string | null>(null)

    useEffect(() => {
        // Fetch initial version on mount
        const checkVersion = async () => {
            try {
                const res = await fetch('/api/health/version')
                if (!res.ok) return
                const data = await res.json()

                if (!clientVersionRef.current) {
                    // First check - store initial version
                    clientVersionRef.current = data.version
                    console.log('[VersionChecker] Initial version:', data.version)
                } else if (clientVersionRef.current !== data.version) {
                    // Version mismatch detected!
                    console.log(`[VersionChecker] Version mismatch! Client: ${clientVersionRef.current}, Server: ${data.version}`)

                    toast('New update available!', {
                        description: 'A new version of the app has been deployed.',
                        action: {
                            label: 'Refresh',
                            onClick: () => window.location.reload()
                        },
                        duration: Infinity, // Stay until clicked
                        icon: <RotateCw className="h-4 w-4 animate-spin" />
                    })

                    // Update ref to prevent spamming
                    clientVersionRef.current = data.version
                }
            } catch (e) {
                console.error("[VersionChecker] Failed to check version", e)
            }
        }

        // Check immediately
        checkVersion()

        // Poll every 60 seconds (reasonable interval)
        const interval = setInterval(checkVersion, 60 * 1000)

        // Also check when window regains focus
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion()
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, []) // Empty deps - only run once on mount

    return null // Headless component
}
