import * as XLSX from 'xlsx'

export interface ExcelExportOptions {
    fileName?: string
    sheets: Array<{
        name: string
        data: any[]
        columns?: { header: string; key: string; width?: number }[]
    }>
    metadata?: {
        title?: string
        company?: string
        dateRange?: string
        generatedAt?: string
    }
}

export async function generateExcel(options: ExcelExportOptions): Promise<void> {
    const { fileName, sheets, metadata } = options

    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Add metadata sheet if provided
    if (metadata) {
        const metadataArray = [
            ['Report Information'],
            [''],
            ...(metadata.title ? [['Title', metadata.title]] : []),
            ...(metadata.company ? [['Company', metadata.company]] : []),
            ...(metadata.dateRange ? [['Period', metadata.dateRange]] : []),
            ...(metadata.generatedAt ? [['Generated', metadata.generatedAt]] : [])
        ]

        const metadataSheet = XLSX.utils.aoa_to_sheet(metadataArray)

        // Set column widths for metadata sheet
        metadataSheet['!cols'] = [
            { wch: 15 },
            { wch: 40 }
        ]

        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Info')
    }

    // Add data sheets
    for (const sheet of sheets) {
        let worksheet: XLSX.WorkSheet

        if (sheet.columns) {
            // Use custom column mapping
            const headers = sheet.columns.map(col => col.header)
            const data = sheet.data.map(row =>
                sheet.columns!.map(col => row[col.key] ?? '')
            )

            worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])

            // Set column widths
            worksheet['!cols'] = sheet.columns.map(col => ({
                wch: col.width || 15
            }))
        } else {
            // Auto-generate from data
            worksheet = XLSX.utils.json_to_sheet(sheet.data)

            // Auto-size columns
            const cols = Object.keys(sheet.data[0] || {})
            worksheet['!cols'] = cols.map(() => ({ wch: 15 }))
        }

        // Freeze header row
        worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    }

    // Generate file name
    const finalFileName = fileName || `export_${Date.now()}.xlsx`

    // Write the file
    XLSX.writeFile(workbook, finalFileName)
}

export async function generateSimpleExcel(
    data: any[],
    fileName?: string,
    sheetName: string = 'Data'
): Promise<void> {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Auto-size columns
    if (data.length > 0) {
        const cols = Object.keys(data[0])
        worksheet['!cols'] = cols.map(col => {
            const maxLength = Math.max(
                col.length,
                ...data.map(row => String(row[col] || '').length)
            )
            return { wch: Math.min(maxLength + 2, 50) }
        })
    }

    // Freeze header row
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const finalFileName = fileName || `export_${Date.now()}.xlsx`
    XLSX.writeFile(workbook, finalFileName)
}

// Helper function to format currency in Excel
export function formatCurrency(value: number, symbol: string = '₹'): string {
    return `${symbol}${value.toFixed(2)}`
}

// Helper function to format date for Excel
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}
