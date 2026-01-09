"use client"

import { useState } from 'react'
import { Printer, FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface ExportToolbarProps {
    onPrint?: () => void | Promise<void>
    onExportPDF?: () => void | Promise<void>
    onExportExcel?: () => void | Promise<void>
    onExportCSV?: () => void | Promise<void>
    disabled?: boolean
    className?: string
}

export function ExportToolbar({
    onPrint,
    onExportPDF,
    onExportExcel,
    onExportCSV,
    disabled = false,
    className = ''
}: ExportToolbarProps) {
    const [loading, setLoading] = useState<{
        print: boolean
        pdf: boolean
        excel: boolean
        csv: boolean
    }>({
        print: false,
        pdf: false,
        excel: false,
        csv: false
    })

    const handleAction = async (
        action: () => void | Promise<void>,
        type: 'print' | 'pdf' | 'excel' | 'csv'
    ) => {
        if (disabled || loading[type]) return

        setLoading(prev => ({ ...prev, [type]: true }))

        try {
            await action()
            const messages = {
                print: 'Opening print dialog...',
                pdf: 'PDF exported successfully',
                excel: 'Excel file exported successfully',
                csv: 'CSV file exported successfully'
            }
            toast.success(messages[type])
        } catch (error: any) {
            console.error(`Export ${type} failed:`, error)
            toast.error(error.message || `Failed to export ${type.toUpperCase()}`)
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }))
        }
    }

    const isAnyLoading = Object.values(loading).some(Boolean)

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {onPrint && (
                <button
                    onClick={() => handleAction(onPrint, 'print')}
                    disabled={disabled || isAnyLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Print Report"
                >
                    {loading.print ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Printer className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Print</span>
                </button>
            )}

            {onExportPDF && (
                <button
                    onClick={() => handleAction(onExportPDF, 'pdf')}
                    disabled={disabled || isAnyLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Export as PDF"
                >
                    {loading.pdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileDown className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">PDF</span>
                </button>
            )}

            {onExportExcel && (
                <button
                    onClick={() => handleAction(onExportExcel, 'excel')}
                    disabled={disabled || isAnyLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Export as Excel"
                >
                    {loading.excel ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Excel</span>
                </button>
            )}

            {onExportCSV && (
                <button
                    onClick={() => handleAction(onExportCSV, 'csv')}
                    disabled={disabled || isAnyLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Export as CSV"
                >
                    {loading.csv ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">CSV</span>
                </button>
            )}
        </div>
    )
}
