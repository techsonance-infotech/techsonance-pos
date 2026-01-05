'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const PRINTER_SETTINGS_KEYS = [
    'printer_name',
    'printer_type',
    'paper_width',
    'auto_print',
    'print_copies',
    'connection_type',
    'font_size',
    'print_quality',
    'cut_type',
    'enable_buzzer',
    'character_encoding',
    'line_spacing',
    'top_margin',
    'bottom_margin',
    'enable_qr_code',
    'footer_text'
]

export async function getPrinterSettings() {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: PRINTER_SETTINGS_KEYS
                }
            }
        })

        const settingsMap: any = {}
        settings.forEach((setting: any) => {
            const key = setting.key.replace('printer_', '').replace(/_([a-z])/g, (_: any, letter: any) => letter.toUpperCase())
            let value: any = setting.value

            // Parse numeric values
            if (['paperWidth', 'printCopies', 'lineSpacing', 'topMargin', 'bottomMargin'].includes(key)) {
                value = value ? parseInt(value) : null
            }
            // Parse boolean values
            else if (['autoPrint', 'enableBuzzer', 'enableQrCode'].includes(key)) {
                value = value === 'true'
            }

            settingsMap[key] = value
        })

        return settingsMap
    } catch (error) {
        console.error("Failed to fetch printer settings:", error)
        return null
    }
}

export async function updatePrinterSettings(data: {
    printerName: string
    printerType: string
    paperWidth: number
    autoPrint: boolean
    printCopies: number
    connectionType: string
    fontSize: string
    printQuality: string
    cutType: string
    enableBuzzer: boolean
    characterEncoding: string
    lineSpacing: number
    topMargin: number
    bottomMargin: number
    enableQrCode: boolean
    footerText: string
}) {
    try {
        const updates = [
            { key: 'printer_name', value: data.printerName },
            { key: 'printer_type', value: data.printerType },
            { key: 'paper_width', value: data.paperWidth.toString() },
            { key: 'auto_print', value: data.autoPrint.toString() },
            { key: 'print_copies', value: data.printCopies.toString() },
            { key: 'connection_type', value: data.connectionType },
            { key: 'font_size', value: data.fontSize },
            { key: 'print_quality', value: data.printQuality },
            { key: 'cut_type', value: data.cutType },
            { key: 'enable_buzzer', value: data.enableBuzzer.toString() },
            { key: 'character_encoding', value: data.characterEncoding },
            { key: 'line_spacing', value: data.lineSpacing.toString() },
            { key: 'top_margin', value: data.topMargin.toString() },
            { key: 'bottom_margin', value: data.bottomMargin.toString() },
            { key: 'enable_qr_code', value: data.enableQrCode.toString() },
            { key: 'footer_text', value: data.footerText }
        ]

        for (const update of updates) {
            await prisma.systemConfig.upsert({
                where: { key: update.key },
                update: { value: update.value },
                create: { key: update.key, value: update.value }
            })
        }

        revalidatePath('/dashboard/settings/printers')
        return { success: true }
    } catch (error) {
        console.error("Failed to update printer settings:", error)
        return { success: false, error: "Failed to update printer settings" }
    }
}

export async function testPrint() {
    try {
        // Get current printer settings
        const settings = await getPrinterSettings()

        // In a real implementation, this would send commands to the printer
        // For now, we'll simulate a successful test print

        console.log("Test print triggered with settings:", settings)

        // Simulate printer communication delay
        await new Promise(resolve => setTimeout(resolve, 500))

        return { success: true, message: "Test print sent to printer" }
    } catch (error) {
        console.error("Test print failed:", error)
        return { success: false, error: "Failed to send test print" }
    }
}

// Helper function to get printer settings for use in other parts of the app
export async function getAutoPrintEnabled() {
    try {
        const setting = await prisma.systemConfig.findUnique({
            where: { key: 'auto_print' }
        })
        return setting?.value === 'true'
    } catch (error) {
        return false
    }
}

// Helper function to get print copies setting
export async function getPrintCopies() {
    try {
        const setting = await prisma.systemConfig.findUnique({
            where: { key: 'print_copies' }
        })
        return setting?.value ? parseInt(setting.value) : 1
    } catch (error) {
        return 1
    }
}
