"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ExportButtonProps {
    data: any[]
    filename: string
    headers?: string[]
}

export function ExportButton({ data, filename, headers }: ExportButtonProps) {
    const exportToCSV = () => {
        if (!data || data.length === 0) {
            alert('No data to export')
            return
        }

        // Get headers from first object if not provided
        const csvHeaders = headers || Object.keys(data[0])

        // Create CSV content
        const csvContent = [
            csvHeaders.join(','),
            ...data.map(row =>
                csvHeaders.map(header => {
                    const value = row[header]
                    // Handle values with commas or quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                }).join(',')
            )
        ].join('\\n')

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToPDF = () => {
        // Use browser print dialog for PDF
        window.print()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                    Export as PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
