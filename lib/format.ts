import { format as dateFnsFormat, parse } from 'date-fns'

/**
 * Format currency amount with symbol
 * @param amount - The amount to format
 * @param currencySymbol - Currency symbol (default: $)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencySymbol: string = '$'): string {
    const safeAmount = amount || 0
    const formatted = safeAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${currencySymbol}${formatted}`
}

/**
 * Format date according to specified format
 * @param date - Date to format (Date object or string)
 * @param formatString - Format string (e.g., 'MM/DD/YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatString: string = 'MM/DD/YYYY'): string {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date

        // Convert format string to date-fns format
        let fnsFormat = formatString
            .replace('YYYY', 'yyyy')
            .replace('DD', 'dd')
            .replace('MMM', 'MMM')
            .replace('MM', 'MM')
            .replace('YY', 'yy')

        return dateFnsFormat(dateObj, fnsFormat)
    } catch (error) {
        console.error('Error formatting date:', error)
        return String(date)
    }
}

/**
 * Parse amount string and return number
 * @param amountString - String representation of amount
 * @returns Parsed number
 */
export function parseCurrency(amountString: string): number {
    return parseFloat(amountString.replace(/[^0-9.-]+/g, '')) || 0
}
