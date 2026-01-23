import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PDFExportOptions {
    title: string
    dateRange?: string
    companyName?: string
    storeName?: string
    logoUrl?: string
    data: any[]
    columns: { header: string; dataKey: string; width?: number }[]
    fileName?: string
    orientation?: 'portrait' | 'landscape'
    additionalInfo?: { label: string; value: string }[]
}

export async function generatePDF(options: PDFExportOptions): Promise<void> {
    const {
        title,
        dateRange,
        companyName = 'SyncServe POS',
        storeName,
        data,
        columns,
        fileName,
        orientation = 'portrait',
        additionalInfo = []
    } = options

    // Helper to sanitize currency for PDF (replace ₹ with Rs.)
    const sanitizeCurrency = (str: string) => {
        return str?.replace(/₹/g, 'Rs. ') || str
    }

    // Create PDF document
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 15

    // Brand Colors
    const BRAND_COLOR = [249, 115, 22] // Orange
    const TEXT_COLOR = [55, 65, 81] // Gray-700
    const LIGHT_BG = [249, 250, 251] // Gray-50

    // --- Header Section ---
    // Add colored header bar
    doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2])
    doc.rect(0, 0, pageWidth, 4, 'F')

    // Company Name
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2])
    doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 8

    if (storeName) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128) // Gray-500
        doc.text(storeName, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 10
    } else {
        yPosition += 5
    }

    // Report Title Box
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2])
    doc.setDrawColor(229, 231, 235) // Gray-200
    doc.roundedRect(14, yPosition, pageWidth - 28, 16, 2, 2, 'FD')

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2])
    doc.text(title, pageWidth / 2, yPosition + 7, { align: 'center' })

    if (dateRange) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text(dateRange, pageWidth / 2, yPosition + 12, { align: 'center' })
    }
    yPosition += 25

    // --- Summary Section ---
    if (additionalInfo.length > 0) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2])
        doc.text("Summary", 14, yPosition)
        yPosition += 5

        // Create a summary grid
        // Calculate dynamic width based on number of items (max 3 per row)
        const itemsPerRow = 3
        const cardWidth = (pageWidth - 28 - ((itemsPerRow - 1) * 5)) / itemsPerRow
        const cardHeight = 18

        additionalInfo.forEach((info, index) => {
            const row = Math.floor(index / itemsPerRow)
            const col = index % itemsPerRow
            const x = 14 + (col * (cardWidth + 5))
            const y = yPosition + (row * (cardHeight + 5))

            // Card Background
            doc.setFillColor(255, 255, 255)
            doc.setDrawColor(229, 231, 235)
            doc.roundedRect(x, y, cardWidth, cardHeight, 1, 1, 'FD')

            // Label
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(107, 114, 128)
            doc.text(info.label, x + 4, y + 6)

            // Value
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2])
            doc.text(sanitizeCurrency(info.value), x + 4, y + 13)
        })

        const rowCount = Math.ceil(additionalInfo.length / itemsPerRow)
        yPosition += (rowCount * (cardHeight + 5)) + 5
    }

    // --- Detail Table ---
    autoTable(doc, {
        startY: yPosition,
        head: [columns.map(col => col.header)],
        body: data.map(row => columns.map(col => {
            let value = row[col.dataKey]
            // Sanitize string values that might be currency
            if (typeof value === 'string') {
                value = sanitizeCurrency(value)
            }
            return value !== null && value !== undefined ? String(value) : '-'
        })),
        theme: 'grid', // Cleaner look than striped default
        headStyles: {
            fillColor: [255, 255, 255] as [number, number, number],
            textColor: BRAND_COLOR as [number, number, number],
            fontStyle: 'bold',
            fontSize: 9,
            lineWidth: 0.1,
            lineColor: [229, 231, 235] as [number, number, number]
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: TEXT_COLOR as [number, number, number],
            lineColor: [243, 244, 246] as [number, number, number]
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        columnStyles: columns.reduce((acc, col, index) => {
            const styles: any = {}
            if (col.width) styles.cellWidth = col.width
            // Right align numeric/currency columns vaguely detected by name
            if (['amount', 'revenue', 'price', 'total', 'sales'].some(k => col.dataKey.toLowerCase().includes(k))) {
                styles.halign = 'right'
            }
            acc[index] = styles
            return acc
        }, {} as any),
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Footer
            const footerY = pageHeight - 10
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(156, 163, 175) // Gray-400

            // Footer line
            doc.setDrawColor(229, 231, 235)
            doc.line(14, footerY - 4, pageWidth - 14, footerY - 4)

            // Page number
            const pageNum = `Page ${doc.getCurrentPageInfo().pageNumber}`
            doc.text(pageNum, pageWidth - 14, footerY, { align: 'right' })

            // Generated timestamp
            const timestamp = new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', // Hardcoded as per user locale context
                dateStyle: 'medium',
                timeStyle: 'short'
            })
            doc.text(`Generated: ${timestamp}`, 14, footerY)
        }
    })

    // Save the PDF
    const finalFileName = fileName || `${title.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.pdf`
    doc.save(finalFileName)
}

export async function generateMultiSheetPDF(
    sheets: Array<{
        title: string
        data: any[]
        columns: { header: string; dataKey: string; width?: number }[]
    }>,
    options: Omit<PDFExportOptions, 'data' | 'columns'>
): Promise<void> {
    // For PDF, we'll create separate sections instead of sheets
    const doc = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    let isFirstSheet = true

    for (const sheet of sheets) {
        if (!isFirstSheet) {
            doc.addPage()
        }

        let yPosition = 20

        // Add sheet title
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(sheet.title, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 10

        // Generate table for this sheet
        autoTable(doc, {
            startY: yPosition,
            head: [sheet.columns.map(col => col.header)],
            body: sheet.data.map(row => sheet.columns.map(col => {
                const value = row[col.dataKey]
                return value !== null && value !== undefined ? String(value) : '-'
            })),
            theme: 'striped',
            headStyles: {
                fillColor: [249, 115, 22],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 3
            }
        })

        isFirstSheet = false
    }

    const finalFileName = options.fileName || `report_${Date.now()}.pdf`
    doc.save(finalFileName)
}
