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

// Default printer settings for thermal printers (80mm)
const DEFAULT_PRINTER_SETTINGS: Record<string, string> = {
    'printer_name': '',
    'printer_type': 'thermal_80mm',
    'paper_width': '80',
    'auto_print': 'false',
    'print_copies': '1',
    'connection_type': 'usb',
    'font_size': 'medium',
    'print_quality': 'high',
    'cut_type': 'full',
    'enable_buzzer': 'true',
    'character_encoding': 'UTF-8',
    'line_spacing': '1',
    'top_margin': '0',
    'bottom_margin': '0',
    'enable_qr_code': 'false',
    'footer_text': 'Thanks'
}

import { getUserProfile } from "./user"

// Ensure default printer settings exist in database
export async function ensureDefaultPrinterSettings() {
    try {
        for (const key of PRINTER_SETTINGS_KEYS) {
            const existing = await prisma.systemConfig.findUnique({
                where: { key }
            })

            if (!existing && DEFAULT_PRINTER_SETTINGS[key] !== undefined) {
                await prisma.systemConfig.create({
                    data: {
                        key,
                        value: DEFAULT_PRINTER_SETTINGS[key]
                    }
                })
            }
        }
        return { success: true }
    } catch (error) {
        console.error("Failed to ensure default printer settings:", error)
        return { success: false }
    }
}

export async function getPrinterSettings() {
    const user = await getUserProfile()
    if (!user) return null

    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: PRINTER_SETTINGS_KEYS
                }
            }
        })

        // Start with defaults, then override with saved values
        const settingsMap: any = {
            printerName: '',
            printerType: 'thermal_80mm',
            paperWidth: 80,
            autoPrint: false,
            printCopies: 1,
            connectionType: 'usb',
            fontSize: 'medium',
            printQuality: 'high',
            cutType: 'full',
            enableBuzzer: true,
            characterEncoding: 'UTF-8',
            lineSpacing: 1,
            topMargin: 0,
            bottomMargin: 0,
            enableQrCode: false,
            footerText: 'Thanks'
        }

        settings.forEach((setting: any) => {
            const key = setting.key.replace('printer_', '').replace(/_([a-z])/g, (_: any, letter: any) => letter.toUpperCase())
            let value: any = setting.value

            // Parse numeric values
            if (['paperWidth', 'printCopies', 'lineSpacing', 'topMargin', 'bottomMargin'].includes(key)) {
                value = value ? parseInt(value) : settingsMap[key]
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
        // Return defaults even on error
        return {
            printerName: '',
            printerType: 'thermal_80mm',
            paperWidth: 80,
            autoPrint: false,
            printCopies: 1,
            connectionType: 'usb',
            fontSize: 'medium',
            printQuality: 'high',
            cutType: 'full',
            enableBuzzer: true,
            characterEncoding: 'UTF-8',
            lineSpacing: 1,
            topMargin: 0,
            bottomMargin: 0,
            enableQrCode: false,
            footerText: 'Thanks'
        }
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
    const user = await getUserProfile()
    if (!user) return { success: false, error: "Unauthorized" }

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
    const user = await getUserProfile()
    if (!user) return { success: false, error: "Unauthorized" }

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
