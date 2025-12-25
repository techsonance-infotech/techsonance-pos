"use client"

import { useEffect, useState } from 'react'
import { getCurrency } from '@/app/actions/preferences'

export function useCurrency() {
    const [currency, setCurrency] = useState({ code: 'USD', symbol: '$' })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadCurrency() {
            try {
                const curr = await getCurrency()
                setCurrency(curr)
            } catch (error) {
                console.error('Failed to load currency:', error)
            } finally {
                setLoading(false)
            }
        }
        loadCurrency()
    }, [])

    return { currency, loading }
}
