import React, { forwardRef } from 'react'
import { cn } from "@/lib/utils"

// Type definitions matching the order structure
interface ReceiptProps {
    businessDetails?: {
        name?: string
        address?: string
        phone?: string
        email?: string
        taxRate?: string
        taxName?: string
        showTaxBreakdown?: boolean
        enableDiscount?: boolean
        logoUrl?: string
    }
    storeDetails?: {
        name?: string | null
        location?: string | null
        contactNo?: string | null
    } | null
    order: {
        kotNo: string
        createdAt: Date | string
        customerName?: string
        customerMobile?: string
        tableName?: string
        items: any[]
        totalAmount: number
        subtotal?: number
        taxAmount?: number
        discount?: string | number
        discountAmount?: number
        paymentMode?: string
    }
    printerSettings?: {
        paperWidth?: string | number
        type?: string
        fontSize?: string
        footerText?: string
        enableQrCode?: boolean
        cutType?: string
    } | null
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(({ order, businessDetails, storeDetails, printerSettings }, ref) => {
    // Calculate defaults if not provided (fallback logic)
    const calculatedSubtotal = order.items.reduce((sum, item) => {
        const itemTotal = item.unitPrice * item.quantity;
        const addonTotal = item.addons ? item.addons.reduce((acc: number, addon: any) => acc + (addon.addon.price * addon.quantity), 0) : 0;
        return sum + itemTotal + addonTotal;
    }, 0);

    const subtotal = order.subtotal ?? calculatedSubtotal;

    // --- STRICT BUSINESS LOGIC ENFORCEMENT ---

    // 1. Discount Logic
    const isDiscountEnabled = businessDetails?.enableDiscount === true
    const minOrderForDiscount = parseFloat((businessDetails as any)?.minOrderForDiscount || '0')
    const maxDiscountVal = parseFloat((businessDetails as any)?.maxDiscount || '0')

    let discountAmount = order.discountAmount ?? 0

    // Auto-Correct: If subtotal < minOrder, Discount MUST be 0
    if (subtotal < minOrderForDiscount) {
        discountAmount = 0
    }

    // Auto-Correct: Cap at Max Discount (if max > 0)
    if (maxDiscountVal > 0 && discountAmount > maxDiscountVal) {
        discountAmount = maxDiscountVal
    }

    // If disabled, zero it out for calculation correctness (per user request to "not be visible" implies not applying)
    if (!isDiscountEnabled) {
        discountAmount = 0
    }

    // 2. Tax Logic
    const isTaxEnabled = businessDetails?.showTaxBreakdown === true
    const taxRate = businessDetails?.taxRate ? parseFloat(businessDetails.taxRate.toString()) : 0
    let taxAmount = order.taxAmount ?? 0

    // If disabled, zero it out? User said "not visible when... disabled". 
    // Usually tax is statutory, but if they disable tax breakdown, they might just want flat total.
    // However, strictly hiding the ROW is different from changing the TOTAL.
    // But the user said "same logic... for bill printing". In NewOrder, if tax is disabled, tax is 0.
    if (!isTaxEnabled) {
        taxAmount = 0
    }

    const finalTotal = subtotal + taxAmount - discountAmount

    // Date Format: DD/MM/YYYY
    const formatDate = (date: Date | string) => {
        try {
            return new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return String(date);
        }
    };

    // Printer Settings Logic
    const paperWidth = printerSettings?.paperWidth ? parseInt(printerSettings.paperWidth.toString()) : 80
    // Adjust container width: 80mm -> 78mm usable, 58mm -> 56mm usable
    const containerWidth = `${paperWidth - 2}mm`

    // Font Scaling based on settings or width
    const isSmallPaper = paperWidth <= 58
    const fontSizeClass = isSmallPaper || printerSettings?.fontSize === 'small' ? 'text-[10px]' : 'text-xs'

    return (
        <div ref={ref} className={cn("hidden print:block bg-white text-black font-mono leading-tight", fontSizeClass)} style={{ width: containerWidth, padding: '4px', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Header */}
            <div className="text-center mb-2 border-b border-black pb-2 border-dashed flex flex-col items-center justify-center">

                {/* Logo */}
                {businessDetails?.logoUrl && (
                    <img
                        src={businessDetails.logoUrl}
                        alt="Logo"
                        className="h-16 w-auto mb-2 object-contain grayscale"
                        style={{ maxHeight: '60px', maxWidth: '100%' }}
                    />
                )}

                <h1 className="text-xl font-bold uppercase tracking-wider mb-1">{storeDetails?.name || businessDetails?.name || 'SyncServe'}</h1>

                {storeDetails?.location ? (
                    <p className="whitespace-pre-wrap px-2 font-medium mb-1">{storeDetails.location}</p>
                ) : (
                    businessDetails?.address && <p className="whitespace-pre-wrap px-2 mb-1">{businessDetails.address}</p>
                )}

                {storeDetails?.contactNo ? (
                    <p className="">Ph: {storeDetails.contactNo}</p>
                ) : (
                    businessDetails?.phone && <p className="">Ph: {businessDetails.phone}</p>
                )}

                {businessDetails?.email && <p className="">Email: {businessDetails.email}</p>}

                {isTaxEnabled && businessDetails?.taxName && (
                    <p className="mt-1 font-bold">{businessDetails.taxName} Invoice</p>
                )}
            </div>

            {/* Order Info */}
            <div className="mb-2 text-[11px]">
                <div className="flex justify-between">
                    <span>Date: {formatDate(order.createdAt)}</span>
                    <span>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between font-bold mt-1">
                    <span>Invoice No: {order.kotNo}</span>
                </div>
                {order.tableName && (
                    <div className="mt-[2px]">Table: {order.tableName}</div>
                )}

                {(order.customerName || order.customerMobile) && (
                    <div className="mt-1 border-t border-dashed border-black pt-1">
                        {order.customerName && <div>Customer: {order.customerName}</div>}
                        {order.customerMobile && <div>Ph: {order.customerMobile}</div>}
                    </div>
                )}
            </div>

            {/* Items Header */}
            <div className="border-b border-black border-dashed mb-1 pb-1 flex font-bold uppercase text-[11px]">
                <div style={{ width: '40%' }}>Item</div>
                <div style={{ width: '15%', textAlign: 'center' }}>Qty</div>
                <div style={{ width: '22%', textAlign: 'right' }}>Price</div>
                <div style={{ width: '23%', textAlign: 'right' }}>Amt</div>
            </div>

            {/* Items List */}
            <div className="mb-2 space-y-1">
                {order.items.map((item, index) => {
                    const itemTotal = item.unitPrice * item.quantity;
                    return (
                        <div key={index}>
                            <div className="flex text-[11px]">
                                <div style={{ width: '40%' }} className="truncate font-medium">{item.name}</div>
                                <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                                <div style={{ width: '22%', textAlign: 'right' }}>{item.unitPrice}</div>
                                <div style={{ width: '23%', textAlign: 'right', fontWeight: 'bold' }}>
                                    {itemTotal.toFixed(2)}
                                </div>
                            </div>
                            {/* Addons */}
                            {item.addons && item.addons.length > 0 && item.addons.map((addon: any, idx: number) => (
                                <div key={idx} className="flex text-[10px] text-gray-600" style={{ paddingLeft: '8px' }}>
                                    <div style={{ width: '40%' }}>+ {addon.addon.name}</div>
                                    <div style={{ width: '15%', textAlign: 'center' }}>{addon.quantity}</div>
                                    <div style={{ width: '22%', textAlign: 'right' }}>{addon.addon.price}</div>
                                    <div style={{ width: '23%', textAlign: 'right' }}>
                                        {(addon.addon.price * addon.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{subtotal.toFixed(2)}</span>
                </div>

                {/* Discount - Strict Visibility */}
                {isDiscountEnabled && discountAmount > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span>
                                Discount
                                {order.discount ? ` (${order.discount})` : ''}:
                            </span>
                            <span>- {discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 mt-1 mb-1">
                            <span className="font-semibold">Taxable Amount:</span>
                            <span className="font-semibold">{(subtotal - discountAmount).toFixed(2)}</span>
                        </div>
                    </>
                )}

                {/* Tax Breakdown - Strict Visibility */}
                {isTaxEnabled && taxAmount > 0 && (
                    <>
                        {businessDetails?.taxName && businessDetails.taxName.toLowerCase().includes('gst') ? (
                            <>
                                <div className="flex justify-between">
                                    <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                                    <span>{(taxAmount / 2).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                                    <span>{(taxAmount / 2).toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between">
                                <span>
                                    {businessDetails?.taxName || 'Tax'}
                                    ({taxRate}%):
                                </span>
                                <span>{taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </>
                )}

                <div className="flex justify-between border-b border-dashed border-black pb-1 mb-1 mt-1">
                    <span>Payment Mode:</span>
                    <span>{order.paymentMode || 'CASH'}</span>
                </div>

                <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total:</span>
                    <span>₹{Math.round(finalTotal).toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 border-t border-black border-dashed pt-2">
                {printerSettings?.footerText ? (
                    <p className="font-bold whitespace-pre-wrap mb-1">{printerSettings.footerText}</p>
                ) : (
                    <p className="font-bold mb-1">Thank you for visiting!</p>
                )}

                {printerSettings?.enableQrCode && (
                    <div className="flex justify-center my-2">
                        {/* Placeholder for QR Code - in real app would use a QR lib */}
                        <div className="border border-black p-1">
                            <div className="text-[9px] uppercase tracking-tighter">Scan to Pay</div>
                        </div>
                    </div>
                )}

                <p className="text-[10px] text-gray-500">Powered by SyncServe POS</p>

                {/* Cut Marker for simulation usually handled by printer but good for visual debugging */}
                {printerSettings?.cutType === 'partial' && (
                    <div className="border-b-4 border-dotted border-gray-300 w-full mt-4 print:hidden" title="Partial Cut Marker" />
                )}
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
