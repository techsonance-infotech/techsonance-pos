export interface CSVExportOptions {
    data: any[]
    columns?: { header: string; key: string }[]
    fileName?: string
    delimiter?: ',' | ';' | '\t'
    includeHeaders?: boolean
}

export async function generateCSV(options: CSVExportOptions): Promise<void> {
    const {
        data,
        columns,
        fileName,
        delimiter = ',',
        includeHeaders = true
    } = options

    if (!data || data.length === 0) {
        throw new Error('No data to export')
    }

    let csvContent = ''

    // Add UTF-8 BOM for Excel compatibility
    csvContent = '\uFEFF'

    // Determine columns
    const cols = columns || Object.keys(data[0]).map(key => ({ header: key, key }))

    // Add headers
    if (includeHeaders) {
        const headerRow = cols.map(col => escapeCSVValue(col.header, delimiter)).join(delimiter)
        csvContent += headerRow + '\n'
    }

    // Add data rows
    for (const row of data) {
        const rowData = cols.map(col => {
            const value = row[col.key]
            return escapeCSVValue(value, delimiter)
        })
        csvContent += rowData.join(delimiter) + '\n'
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const finalFileName = fileName || `export_${Date.now()}.csv`

    link.setAttribute('href', url)
    link.setAttribute('download', finalFileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function escapeCSVValue(value: any, delimiter: string): string {
    if (value === null || value === undefined) {
        return ''
    }

    let stringValue = String(value)

    // Check if value needs to be quoted
    const needsQuotes =
        stringValue.includes(delimiter) ||
        stringValue.includes('"') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r')

    if (needsQuotes) {
        // Escape double quotes by doubling them
        stringValue = stringValue.replace(/"/g, '""')
        // Wrap in quotes
        stringValue = `"${stringValue}"`
    }

    return stringValue
}

export async function generateSimpleCSV(
    data: any[],
    fileName?: string
): Promise<void> {
    return generateCSV({
        data,
        fileName,
        includeHeaders: true
    })
}
