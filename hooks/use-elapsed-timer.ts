"use client"

import { useState, useEffect } from "react"

export function useElapsedTimer(startTime: string | null): string {
    const [elapsed, setElapsed] = useState("")

    useEffect(() => {
        if (!startTime) {
            setElapsed("")
            return
        }

        const start = new Date(startTime).getTime()

        const updateTimer = () => {
            const now = Date.now()
            const diff = Math.floor((now - start) / 1000)

            if (diff < 0) {
                setElapsed("00:00")
                return
            }

            const hours = Math.floor(diff / 3600)
            const minutes = Math.floor((diff % 3600) / 60)
            const seconds = diff % 60

            if (hours > 0) {
                setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
            } else {
                setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => clearInterval(interval)
    }, [startTime])

    return elapsed
}
