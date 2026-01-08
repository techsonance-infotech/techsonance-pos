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
        companyName = 'TechSonance POS',
        storeName,
        data,
        columns,
        fileName,
        orientation = 'portrait',
        additionalInfo = []
    } = options

    // Create PDF document
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Add company header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 8

    if (storeName) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(storeName, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 6
    }

    // Add report title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 8

    // Add date range if provided
    if (dateRange) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${dateRange}`, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 8
    }

    // Add additional info
    if (additionalInfo.length > 0) {
        doc.setFontSize(9)
        additionalInfo.forEach(info => {
            doc.text(`${info.label}: ${info.value}`, 14, yPosition)
            yPosition += 5
        })
        yPosition += 3
    }

    // Add horizontal line
    doc.setLineWidth(0.5)
    doc.line(14, yPosition, pageWidth - 14, yPosition)
    yPosition += 5

    // Generate table
    autoTable(doc, {
        startY: yPosition,
        head: [columns.map(col => col.header)],
        body: data.map(row => columns.map(col => {
            const value = row[col.dataKey]
            return value !== null && value !== undefined ? String(value) : '-'
        })),
        theme: 'striped',
        headStyles: {
            fillColor: [249, 115, 22], // Orange color matching your brand
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251] // Light gray
        },
        columnStyles: columns.reduce((acc, col, index) => {
            if (col.width) {
                acc[index] = { cellWidth: col.width }
            }
            return acc
        }, {} as any),
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Footer
            const footerY = pageHeight - 10
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(128, 128, 128)

            // Page number
            const pageNum = `Page ${doc.getCurrentPageInfo().pageNumber}`
            doc.text(pageNum, pageWidth - 14, footerY, { align: 'right' })

            // Generated timestamp
            const timestamp = new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
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
