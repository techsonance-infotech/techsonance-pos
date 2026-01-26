"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useEffect, useState, useCallback } from "react"

// Debounce helper
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
}

export function InventoryControls({ totalPages, currentPage }: { totalPages: number, currentPage: number }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState(searchParams.get("search") || "")
    const debouncedSearch = useDebounce(search, 300)

    // Update URL on search change
    useEffect(() => {
        const params = new URLSearchParams(searchParams)
        if (debouncedSearch) {
            params.set("search", debouncedSearch)
        } else {
            params.delete("search")
        }
        params.set("page", "1") // Reset to page 1 on search

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }, [debouncedSearch, pathname, router])
    // Note: searchParams dependency removed to prevent loop, we only read initial

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set("page", newPage.toString())
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Search ingredients..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">
                    Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isPending}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isPending}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
