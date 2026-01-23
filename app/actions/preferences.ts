'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrencyByCode } from "@/lib/currencies"

export async function getAppPreferences() {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: ['theme', 'currency_code', 'currency_symbol', 'date_format']
                }
            }
        })

        const prefs: any = {
            theme: 'light',
            currencyCode: 'INR',
            currencySymbol: '₹',
            dateFormat: 'DD/MM/YYYY'
        }

        settings.forEach((setting: any) => {
            switch (setting.key) {
                case 'theme':
                    prefs.theme = setting.value || 'light'
                    break
                case 'currency_code':
                    prefs.currencyCode = setting.value || 'INR'
                    break
                case 'currency_symbol':
                    prefs.currencySymbol = setting.value || '₹'
                    break
                case 'date_format':
                    prefs.dateFormat = setting.value || 'DD/MM/YYYY'
                    break
            }
        })

        return prefs
    } catch (error) {
        console.error("Failed to fetch app preferences:", error)
        return {
            theme: 'light',
            currencyCode: 'INR',
            currencySymbol: '₹',
            dateFormat: 'DD/MM/YYYY'
        }
    }
}

export async function updateAppPreferences(data: {
    theme: string
    currencyCode: string
    dateFormat: string
}) {
    try {
        const currency = getCurrencyByCode(data.currencyCode)

        const updates = [
            { key: 'theme', value: data.theme },
            { key: 'currency_code', value: data.currencyCode },
            { key: 'currency_symbol', value: currency.symbol },
            { key: 'date_format', value: data.dateFormat }
        ]

        for (const update of updates) {
            await prisma.systemConfig.upsert({
                where: { key: update.key },
                update: { value: update.value },
                create: { key: update.key, value: update.value }
            })
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error("Failed to update app preferences:", error)
        return { success: false, error: "Failed to update preferences" }
    }
}

// Helper functions for use throughout the app
export async function getCurrency() {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: ['currency_code', 'currency_symbol']
                }
            }
        })

        let code = 'INR'
        let symbol = '₹'

        settings.forEach((setting: any) => {
            if (setting.key === 'currency_code') code = setting.value || 'INR'
            if (setting.key === 'currency_symbol') symbol = setting.value || '₹'
        })

        return { code, symbol }
    } catch (error) {
        return { code: 'INR', symbol: '₹' }
    }
}

export async function getDateFormat() {
    try {
        const setting = await prisma.systemConfig.findUnique({
            where: { key: 'date_format' }
        })
        return setting?.value || 'DD/MM/YYYY'
    } catch (error) {
        return 'DD/MM/YYYY'
    }
}

export async function getTheme() {
    try {
        const setting = await prisma.systemConfig.findUnique({
            where: { key: 'theme' }
        })
        return setting?.value || 'light'
    } catch (error) {
        return 'light'
    }
}
