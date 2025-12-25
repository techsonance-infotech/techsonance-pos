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
            currencyCode: 'USD',
            currencySymbol: '$',
            dateFormat: 'MM/DD/YYYY'
        }

        settings.forEach(setting => {
            switch (setting.key) {
                case 'theme':
                    prefs.theme = setting.value || 'light'
                    break
                case 'currency_code':
                    prefs.currencyCode = setting.value || 'USD'
                    break
                case 'currency_symbol':
                    prefs.currencySymbol = setting.value || '$'
                    break
                case 'date_format':
                    prefs.dateFormat = setting.value || 'MM/DD/YYYY'
                    break
            }
        })

        return prefs
    } catch (error) {
        console.error("Failed to fetch app preferences:", error)
        return {
            theme: 'light',
            currencyCode: 'USD',
            currencySymbol: '$',
            dateFormat: 'MM/DD/YYYY'
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

        let code = 'USD'
        let symbol = '$'

        settings.forEach(setting => {
            if (setting.key === 'currency_code') code = setting.value || 'USD'
            if (setting.key === 'currency_symbol') symbol = setting.value || '$'
        })

        return { code, symbol }
    } catch (error) {
        return { code: 'USD', symbol: '$' }
    }
}

export async function getDateFormat() {
    try {
        const setting = await prisma.systemConfig.findUnique({
            where: { key: 'date_format' }
        })
        return setting?.value || 'MM/DD/YYYY'
    } catch (error) {
        return 'MM/DD/YYYY'
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
