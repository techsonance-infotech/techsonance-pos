"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

export function VersionChecker() {
    const [clientVersion, setClientVersion] = useState<string | null>(null)

    useEffect(() => {
        // Fetch initial version on mount
        const checkVersion = async () => {
            try {
                const res = await fetch('/api/health/version')
                if (!res.ok) return
                const data = await res.json()

                if (!clientVersion) {
                    setClientVersion(data.version)
                } else if (clientVersion !== data.version) {
                    // Version mismatch detected!
                    console.log(`Version mismatch! Client: ${clientVersion}, Server: ${data.version}`)

                    toast('New update available!', {
                        description: 'A new version of the app has been deployed.',
                        action: {
                            label: 'Refresh',
                            onClick: () => window.location.reload()
                        },
                        duration: Infinity, // Stay until clicked
                        icon: <RotateCw className="h-4 w-4 animate-spin" />
                    })

                    // Update state to prevent spamming
                    setClientVersion(data.version)
                }
            } catch (e) {
                console.error("Failed to check version", e)
            }
        }

        // Check immediately
        checkVersion()

        // Poll every 60 seconds
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
    }, [clientVersion])

    return null // Headless component
}
