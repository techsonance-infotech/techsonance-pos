'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "@/app/actions/user"
import { revalidatePath } from "next/cache"

const PAYMENT_CONFIG_KEYS = {
    BANK_NAME: 'payment_bank_name',
    ACCOUNT_NAME: 'payment_account_name',
    ACCOUNT_NUMBER: 'payment_account_number',
    IFSC_CODE: 'payment_ifsc_code',
    UPI_ID: 'payment_upi_id'
}

// PaymentConfig type defined locally (cannot export type from 'use server' file)
type PaymentConfig = {
    bankName: string
    accountName: string
    accountNumber: string
    ifscCode: string
    upiId: string
}

/**
 * Get payment configuration (Super Admin only)
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
    const configs = await prisma.systemConfig.findMany({
        where: {
            key: { in: Object.values(PAYMENT_CONFIG_KEYS) }
        }
    })

    const configMap = new Map<string, string>(configs.map((c: { key: string; value: string }) => [c.key, c.value]))

    return {
        bankName: configMap.get(PAYMENT_CONFIG_KEYS.BANK_NAME) ?? '',
        accountName: configMap.get(PAYMENT_CONFIG_KEYS.ACCOUNT_NAME) ?? '',
        accountNumber: configMap.get(PAYMENT_CONFIG_KEYS.ACCOUNT_NUMBER) ?? '',
        ifscCode: configMap.get(PAYMENT_CONFIG_KEYS.IFSC_CODE) ?? '',
        upiId: configMap.get(PAYMENT_CONFIG_KEYS.UPI_ID) ?? ''
    }
}

/**
 * Save payment configuration (Super Admin only)
 */
export async function savePaymentConfig(config: PaymentConfig) {
    const user = await getUserProfile()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const updates = [
        { key: PAYMENT_CONFIG_KEYS.BANK_NAME, value: config.bankName },
        { key: PAYMENT_CONFIG_KEYS.ACCOUNT_NAME, value: config.accountName },
        { key: PAYMENT_CONFIG_KEYS.ACCOUNT_NUMBER, value: config.accountNumber },
        { key: PAYMENT_CONFIG_KEYS.IFSC_CODE, value: config.ifscCode },
        { key: PAYMENT_CONFIG_KEYS.UPI_ID, value: config.upiId }
    ]

    try {
        for (const update of updates) {
            await prisma.systemConfig.upsert({
                where: { key: update.key },
                create: { key: update.key, value: update.value, isEnabled: true },
                update: { value: update.value }
            })
        }

        revalidatePath('/dashboard/admin/license-requests')
        return { success: true }
    } catch (e) {
        console.error("Failed to save payment config:", e)
        return { error: "Failed to save payment configuration" }
    }
}

/**
 * Get formatted payment details message
 */
export async function getPaymentDetailsMessage(amount: number): Promise<string> {
    const config = await getPaymentConfig()

    const hasBank = config.bankName && config.accountNumber && config.ifscCode
    const hasUpi = config.upiId

    if (!hasBank && !hasUpi) {
        return `Please make the payment of ₹${amount.toLocaleString()}.

⚠️ Payment details not configured. Please contact support.`
    }

    let message = `Please make the payment of **₹${amount.toLocaleString()}** using the following details:\n\n`

    if (hasBank) {
        message += `**Bank Transfer:**
- Bank: ${config.bankName}
- Account Name: ${config.accountName}
- Account No: ${config.accountNumber}
- IFSC: ${config.ifscCode}\n\n`
    }

    if (hasUpi) {
        message += `**UPI:**
- UPI ID: ${config.upiId}\n\n`
    }

    message += `After payment, please upload a screenshot of the payment confirmation.`

    return message
}
