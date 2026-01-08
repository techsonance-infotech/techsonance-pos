import { generatePDF } from './pdf-generator'
import { generateExcel } from './excel-generator'
import { generateCSV } from './csv-generator'
import { formatCurrency } from '@/lib/format'

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ExportContext {
    companyName?: string
    storeName?: string
    currency?: string
}

// Daily Sales Report Exporter
export async function exportDailyReport(
    data: any,
    format: ExportFormat,
    context: ExportContext = {}
) {
    const { companyName, storeName, currency = '₹' } = context
    const fileName = `daily-sales_${data.date}_${Date.now()}`

    if (format === 'pdf') {
        await generatePDF({
            title: 'Daily Sales Report',
            dateRange: data.date,
            companyName,
            storeName,
            fileName: `${fileName}.pdf`,
            additionalInfo: [
                { label: 'Total Sales', value: formatCurrency(data.totalSales, currency) },
                { label: 'Orders', value: String(data.orderCount) },
                { label: 'Avg Order Value', value: formatCurrency(data.averageOrderValue, currency) }
            ],
            columns: [
                { header: 'Time', dataKey: 'time', width: 25 },
                { header: 'KOT No', dataKey: 'kotNo', width: 30 },
                { header: 'Customer', dataKey: 'customer', width: 40 },
                { header: 'Items', dataKey: 'items', width: 20 },
                { header: 'Total', dataKey: 'total', width: 30 }
            ],
            data: data.orders.map((order: any) => ({
                ...order,
                total: formatCurrency(order.total, currency)
            }))
        })
    } else if (format === 'excel') {
        await generateExcel({
            fileName: `${fileName}.xlsx`,
            metadata: {
                title: 'Daily Sales Report',
                company: companyName,
                dateRange: data.date,
                generatedAt: new Date().toLocaleString('en-IN')
            },
            sheets: [
                {
                    name: 'Summary',
                    data: [
                        { Metric: 'Total Sales', Value: formatCurrency(data.totalSales, currency) },
                        { Metric: 'Total Orders', Value: data.orderCount },
                        { Metric: 'Average Order Value', Value: formatCurrency(data.averageOrderValue, currency) }
                    ]
                },
                {
                    name: 'Orders',
                    columns: [
                        { header: 'Time', key: 'time', width: 15 },
                        { header: 'KOT No', key: 'kotNo', width: 15 },
                        { header: 'Customer', key: 'customer', width: 25 },
                        { header: 'Items', key: 'items', width: 10 },
                        { header: 'Total', key: 'total', width: 15 }
                    ],
                    data: data.orders.map((order: any) => ({
                        ...order,
                        total: formatCurrency(order.total, currency)
                    }))
                }
            ]
        })
    } else {
        await generateCSV({
            fileName: `${fileName}.csv`,
            columns: [
                { header: 'Time', key: 'time' },
                { header: 'KOT No', key: 'kotNo' },
                { header: 'Customer', key: 'customer' },
                { header: 'Items', key: 'items' },
                { header: 'Total', key: 'total' }
            ],
            data: data.orders.map((order: any) => ({
                ...order,
                total: formatCurrency(order.total, currency)
            }))
        })
    }
}

// Category Report Exporter
export async function exportCategoryReport(
    data: any,
    format: ExportFormat,
    context: ExportContext = {}
) {
    const { companyName, storeName, currency = '₹' } = context
    const fileName = `category-report_${data.startDate}_${data.endDate}_${Date.now()}`

    if (format === 'pdf') {
        await generatePDF({
            title: 'Category-wise Sales Report',
            dateRange: `${data.startDate} to ${data.endDate}`,
            companyName,
            storeName,
            fileName: `${fileName}.pdf`,
            additionalInfo: [
                { label: 'Total Revenue', value: formatCurrency(data.totalRevenue, currency) }
            ],
            columns: [
                { header: 'Category', dataKey: 'name', width: 50 },
                { header: 'Revenue', dataKey: 'revenue', width: 35 },
                { header: 'Quantity', dataKey: 'quantity', width: 25 },
                { header: 'Orders', dataKey: 'orders', width: 25 },
                { header: '% of Total', dataKey: 'percentage', width: 25 }
            ],
            data: data.categories.map((cat: any) => ({
                ...cat,
                revenue: formatCurrency(cat.revenue, currency),
                percentage: `${(cat.percentage || 0).toFixed(1)}%`
            }))
        })
    } else if (format === 'excel') {
        await generateExcel({
            fileName: `${fileName}.xlsx`,
            metadata: {
                title: 'Category-wise Sales Report',
                company: companyName,
                dateRange: `${data.startDate} to ${data.endDate}`,
                generatedAt: new Date().toLocaleString('en-IN')
            },
            sheets: [
                {
                    name: 'Categories',
                    columns: [
                        { header: 'Category', key: 'name', width: 25 },
                        { header: 'Revenue', key: 'revenue', width: 15 },
                        { header: 'Quantity', key: 'quantity', width: 12 },
                        { header: 'Orders', key: 'orders', width: 12 },
                        { header: '% of Total', key: 'percentage', width: 12 }
                    ],
                    data: data.categories.map((cat: any) => ({
                        name: cat.name,
                        revenue: formatCurrency(cat.revenue, currency),
                        quantity: cat.quantity,
                        orders: cat.orders,
                        percentage: `${(cat.percentage || 0).toFixed(1)}%`
                    }))
                }
            ]
        })
    } else {
        await generateCSV({
            fileName: `${fileName}.csv`,
            columns: [
                { header: 'Category', key: 'name' },
                { header: 'Revenue', key: 'revenue' },
                { header: 'Quantity', key: 'quantity' },
                { header: 'Orders', key: 'orders' },
                { header: 'Percentage', key: 'percentage' }
            ],
            data: data.categories.map((cat: any) => ({
                name: cat.name,
                revenue: formatCurrency(cat.revenue, currency),
                quantity: cat.quantity,
                orders: cat.orders,
                percentage: `${(cat.percentage || 0).toFixed(1)}%`
            }))
        })
    }
}

// Monthly Report Exporter
export async function exportMonthlyReport(
    data: any,
    format: ExportFormat,
    context: ExportContext = {}
) {
    const { companyName, storeName, currency = '₹' } = context
    const fileName = `monthly-sales_${data.year}_${Date.now()}`

    if (format === 'pdf') {
        await generatePDF({
            title: 'Monthly Sales Report',
            dateRange: `Year ${data.year}`,
            companyName,
            storeName,
            fileName: `${fileName}.pdf`,
            additionalInfo: [
                { label: 'Total Annual Sales', value: formatCurrency(data.totalSales, currency) },
                { label: 'Best Month', value: data.bestMonth }
            ],
            columns: [
                { header: 'Month', dataKey: 'month', width: 40 },
                { header: 'Sales', dataKey: 'sales', width: 40 },
                { header: 'Orders', dataKey: 'orders', width: 30 }
            ],
            data: data.months.map((month: any) => ({
                ...month,
                sales: formatCurrency(month.sales, currency)
            }))
        })
    } else if (format === 'excel') {
        await generateExcel({
            fileName: `${fileName}.xlsx`,
            metadata: {
                title: 'Monthly Sales Report',
                company: companyName,
                dateRange: `Year ${data.year}`,
                generatedAt: new Date().toLocaleString('en-IN')
            },
            sheets: [
                {
                    name: 'Monthly Data',
                    columns: [
                        { header: 'Month', key: 'month', width: 15 },
                        { header: 'Sales', key: 'sales', width: 15 },
                        { header: 'Orders', key: 'orders', width: 12 }
                    ],
                    data: data.months.map((month: any) => ({
                        month: month.month,
                        sales: formatCurrency(month.sales, currency),
                        orders: month.orders
                    }))
                }
            ]
        })
    } else {
        await generateCSV({
            fileName: `${fileName}.csv`,
            columns: [
                { header: 'Month', key: 'month' },
                { header: 'Sales', key: 'sales' },
                { header: 'Orders', key: 'orders' }
            ],
            data: data.months.map((month: any) => ({
                month: month.month,
                sales: formatCurrency(month.sales, currency),
                orders: month.orders
            }))
        })
    }
}

// Top Items Report Exporter
export async function exportTopItemsReport(
    data: any,
    format: ExportFormat,
    context: ExportContext = {}
) {
    const { companyName, storeName, currency = '₹' } = context
    const fileName = `top-items_${data.startDate}_${data.endDate}_${Date.now()}`

    if (format === 'pdf') {
        await generatePDF({
            title: 'Top Selling Items Report',
            dateRange: `${data.startDate} to ${data.endDate}`,
            companyName,
            storeName,
            fileName: `${fileName}.pdf`,
            columns: [
                { header: 'Rank', dataKey: 'rank', width: 20 },
                { header: 'Item', dataKey: 'name', width: 50 },
                { header: 'Category', dataKey: 'category', width: 35 },
                { header: 'Qty Sold', dataKey: 'quantitySold', width: 25 },
                { header: 'Revenue', dataKey: 'revenue', width: 35 },
                { header: 'Orders', dataKey: 'orders', width: 25 }
            ],
            data: data.items.map((item: any) => ({
                ...item,
                revenue: formatCurrency(item.revenue, currency)
            }))
        })
    } else if (format === 'excel') {
        await generateExcel({
            fileName: `${fileName}.xlsx`,
            metadata: {
                title: 'Top Selling Items Report',
                company: companyName,
                dateRange: `${data.startDate} to ${data.endDate}`,
                generatedAt: new Date().toLocaleString('en-IN')
            },
            sheets: [
                {
                    name: 'Top Items',
                    columns: [
                        { header: 'Rank', key: 'rank', width: 8 },
                        { header: 'Item', key: 'name', width: 30 },
                        { header: 'Category', key: 'category', width: 20 },
                        { header: 'Qty Sold', key: 'quantitySold', width: 12 },
                        { header: 'Revenue', key: 'revenue', width: 15 },
                        { header: 'Orders', key: 'orders', width: 12 }
                    ],
                    data: data.items.map((item: any) => ({
                        rank: item.rank,
                        name: item.name,
                        category: item.category,
                        quantitySold: item.quantitySold,
                        revenue: formatCurrency(item.revenue, currency),
                        orders: item.orders
                    }))
                }
            ]
        })
    } else {
        await generateCSV({
            fileName: `${fileName}.csv`,
            columns: [
                { header: 'Rank', key: 'rank' },
                { header: 'Item', key: 'name' },
                { header: 'Category', key: 'category' },
                { header: 'Quantity Sold', key: 'quantitySold' },
                { header: 'Revenue', key: 'revenue' },
                { header: 'Orders', key: 'orders' }
            ],
            data: data.items.map((item: any) => ({
                rank: item.rank,
                name: item.name,
                category: item.category,
                quantitySold: item.quantitySold,
                revenue: formatCurrency(item.revenue, currency),
                orders: item.orders
            }))
        })
    }
}

// Payment Analysis Exporter
export async function exportPaymentAnalysis(
    data: any,
    format: ExportFormat,
    context: ExportContext = {}
) {
    const { companyName, storeName, currency = '₹' } = context
    const fileName = `payment-analysis_${data.startDate}_${data.endDate}_${Date.now()}`

    if (format === 'pdf') {
        await generatePDF({
            title: 'Payment Method Analysis',
            dateRange: `${data.startDate} to ${data.endDate}`,
            companyName,
            storeName,
            fileName: `${fileName}.pdf`,
            additionalInfo: [
                { label: 'Total Amount', value: formatCurrency(data.totalAmount, currency) }
            ],
            columns: [
                { header: 'Payment Method', dataKey: 'method', width: 50 },
                { header: 'Amount', dataKey: 'amount', width: 40 },
                { header: 'Transactions', dataKey: 'count', width: 30 },
                { header: '% of Total', dataKey: 'percentage', width: 30 }
            ],
            data: data.methods.map((method: any) => ({
                ...method,
                amount: formatCurrency(method.amount, currency),
                percentage: `${(method.percentage || 0).toFixed(1)}%`
            }))
        })
    } else if (format === 'excel') {
        await generateExcel({
            fileName: `${fileName}.xlsx`,
            metadata: {
                title: 'Payment Method Analysis',
                company: companyName,
                dateRange: `${data.startDate} to ${data.endDate}`,
                generatedAt: new Date().toLocaleString('en-IN')
            },
            sheets: [
                {
                    name: 'Payment Methods',
                    columns: [
                        { header: 'Payment Method', key: 'method', width: 20 },
                        { header: 'Amount', key: 'amount', width: 15 },
                        { header: 'Transactions', key: 'count', width: 15 },
                        { header: '% of Total', key: 'percentage', width: 12 }
                    ],
                    data: data.methods.map((method: any) => ({
                        method: method.method,
                        amount: formatCurrency(method.amount, currency),
                        count: method.count,
                        percentage: `${(method.percentage || 0).toFixed(1)}%`
                    }))
                }
            ]
        })
    } else {
        await generateCSV({
            fileName: `${fileName}.csv`,
            columns: [
                { header: 'Payment Method', key: 'method' },
                { header: 'Amount', key: 'amount' },
                { header: 'Transactions', key: 'count' },
                { header: 'Percentage', key: 'percentage' }
            ],
            data: data.methods.map((method: any) => ({
                method: method.method,
                amount: formatCurrency(method.amount, currency),
                count: method.count,
                percentage: `${(method.percentage || 0).toFixed(1)}%`
            }))
        })
    }
}
