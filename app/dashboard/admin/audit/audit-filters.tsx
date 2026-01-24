"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RotateCcw, Search } from "lucide-react"

export function AuditFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Modules list matching backend enum/types
    const modules = [
        "AUTH",
        "USER",
        "STORE",
        "POS",
        "INVENTORY",
        "LICENSING",
        "AI",
        "SYSTEM"
    ]

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value && value !== "ALL") {
                params.set(name, value)
            } else {
                params.delete(name)
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleModuleChange = (value: string) => {
        router.push("?" + createQueryString("module", value))
    }

    const resetFilters = () => {
        router.push("/dashboard/admin/audit")
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex-1 max-w-sm">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Filter by Module</label>
                <Select
                    defaultValue={searchParams.get("module") || "ALL"}
                    onValueChange={handleModuleChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Modules</SelectItem>
                        {modules.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Placeholder for Search - Backend support needed for text search */}
            {/* <div className="flex-1 max-w-sm">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search Actions</label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search logs..." className="pl-9" />
                </div>
            </div> */}

            <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500 hover:text-gray-900">
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
            </div>
        </div>
    )
}
