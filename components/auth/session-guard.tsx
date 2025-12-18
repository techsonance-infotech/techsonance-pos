"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function SessionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isVerified, setIsVerified] = useState(false)

    useEffect(() => {
        // Check if we just logged in successfully
        const justVerified = searchParams.get('verified') === 'true'

        if (justVerified) {
            // Set the session flag
            sessionStorage.setItem('pin_verified', 'true')
            // Clean the URL
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
            setIsVerified(true)
        } else {
            // Check if session flag exists
            const hasSession = sessionStorage.getItem('pin_verified') === 'true'

            if (!hasSession) {
                // If no session flag (browser closed/reopened), force re-verification
                // We assume cookies are still valid (handled by server layout), 
                // so we just need to verify PIN.
                router.push('/pin?mode=verify')
            } else {
                setIsVerified(true)
            }
        }
    }, [router, searchParams])

    // Prevent hydration mismatch or flash of content
    if (!isVerified) {
        return null // Or a loading spinner
    }

    return <>{children}</>
}
