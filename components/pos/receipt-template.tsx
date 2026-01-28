import React, { forwardRef } from 'react'

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
        printQuality?: string
    } | null
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(({ order, businessDetails, storeDetails, printerSettings }, ref) => {
    // Safety Guard
    if (!order || !Array.isArray(order.items)) {
        return null
    }

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

    // If disabled, zero it out for calculation correctness
    if (!isDiscountEnabled) {
        discountAmount = 0
    }

    // 2. Tax Logic
    const isTaxEnabled = businessDetails?.showTaxBreakdown === true
    const taxRate = businessDetails?.taxRate ? parseFloat(businessDetails.taxRate.toString()) : 0
    let taxAmount = order.taxAmount ?? 0

    if (!isTaxEnabled) {
        taxAmount = 0
    }

    const finalTotal = subtotal + taxAmount - discountAmount

    // Date Format: DD/MM/YY (compact for thermal)
    const formatDate = (date: Date | string) => {
        try {
            return new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        } catch (e) {
            return String(date);
        }
    };

    // Time Format: HH:MM
    const formatTime = (date: Date | string) => {
        try {
            return new Date(date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return '';
        }
    };

    // Printer Settings Logic - Default to 80mm
    const paperWidth = printerSettings?.paperWidth ? parseInt(printerSettings.paperWidth.toString()) : 80

    // Font Size based on settings - LARGER defaults for thermal printers
    const fontSize = printerSettings?.fontSize || 'medium'
    const fontSizeStyles = {
        small: {
            base: '14px',
            header: '18px',
            subheader: '16px',
            total: '20px'
        },
        medium: {
            base: '18px', // Increased from 16 to 18
            header: '24px',
            subheader: '20px',
            total: '26px'
        },
        large: {
            base: '20px',
            header: '26px',
            subheader: '22px',
            total: '30px'
        }
    }
    const sizes = fontSizeStyles[fontSize as keyof typeof fontSizeStyles] || fontSizeStyles.medium

    return (
        <div
            ref={ref}
            style={{
                width: '100%',
                minWidth: `${paperWidth}mm`,
                padding: '0 7mm',
                margin: '0',
                backgroundColor: 'white',
                color: '#000000',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '16px',
                fontWeight: '500', // Standard text is dark but not bold
                lineHeight: '1.2',
                boxSizing: 'border-box',
                textRendering: 'optimizeLegibility',
                fontSmooth: 'never',
                WebkitFontSmoothing: 'none'
            }}
        >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px dashed black', paddingBottom: '8px' }}>
                {/* Logo - Centered */}
                {businessDetails?.logoUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <img
                            src={businessDetails.logoUrl}
                            alt="Logo"
                            style={{
                                height: '50px',
                                width: 'auto',
                                maxWidth: '60%',
                                objectFit: 'contain',
                                filter: 'grayscale(100%) contrast(150%)'
                            }}
                        />
                    </div>
                )}

                <div style={{ fontSize: sizes.header, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {storeDetails?.name || businessDetails?.name || 'SyncServe'}
                </div>

                {storeDetails?.location ? (
                    <div style={{ fontSize: sizes.base, fontWeight: '600', marginTop: '2px' }}>{storeDetails.location}</div>
                ) : (
                    businessDetails?.address && <div style={{ fontSize: sizes.base, marginTop: '2px' }}>{businessDetails.address}</div>
                )}

                {storeDetails?.contactNo ? (
                    <div style={{ fontSize: sizes.base }}>Ph: {storeDetails.contactNo}</div>
                ) : (
                    businessDetails?.phone && <div style={{ fontSize: sizes.base }}>Ph: {businessDetails.phone}</div>
                )}

                {businessDetails?.email && <div style={{ fontSize: sizes.base }}>Email: {businessDetails.email}</div>}
            </div>

            {/* Customer Name Section */}
            <div style={{ borderBottom: '1px dashed black', paddingBottom: '4px', marginBottom: '4px' }}>
                <div style={{ fontSize: sizes.base }}>
                    Name: {order.customerName || ''}
                </div>
            </div>

            {/* Order Info - Matching Reference Layout */}
            <div style={{ marginBottom: '6px', fontSize: sizes.base, borderBottom: '1px dashed black', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date: {formatDate(order.createdAt)}</span>
                    <span style={{ fontWeight: '700' }}>
                        {order.tableName ? `Dine In: ${order.tableName.replace('Table ', '')}` : 'Counter'}
                    </span>
                </div>
                <div>{formatTime(order.createdAt)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span>Cashier: {order.customerName ? 'staff' : 'biller'}</span>
                    <span style={{ fontWeight: '700' }}>Bill No.: {order.kotNo.replace('KOT', '')}</span>
                </div>
            </div>

            {/* Items Header - Bold and Clear */}
            <div style={{
                display: 'flex',
                fontWeight: '700',
                fontSize: sizes.subheader,
                borderBottom: '1px dashed black',
                paddingBottom: '4px',
                marginBottom: '4px'
            }}>
                <div style={{ width: '45%' }}>Item</div>
                <div style={{ width: '15%', textAlign: 'center' }}>Qty.</div>
                <div style={{ width: '20%', textAlign: 'right' }}>Price</div>
                <div style={{ width: '20%', textAlign: 'right' }}>Amount</div>
            </div>

            {/* Items List */}
            <div style={{ marginBottom: '6px' }}>
                {order.items.map((item, index) => {
                    const itemTotal = item.unitPrice * item.quantity;
                    return (
                        <div key={index} style={{ marginBottom: '4px' }}>
                            <div style={{ display: 'flex', fontSize: sizes.base }}>
                                <div style={{ width: '45%', fontWeight: '500' }}>{item.name}</div>
                                <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                                <div style={{ width: '20%', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</div>
                                <div style={{ width: '20%', textAlign: 'right', fontWeight: '700' }}>
                                    {itemTotal.toFixed(2)}
                                </div>
                            </div>
                            {/* Addons */}
                            {item.addons && item.addons.length > 0 && item.addons.map((addon: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', fontSize: '12px', paddingLeft: '8px', color: '#333' }}>
                                    <div style={{ width: '45%' }}>+ {addon.addon.name}</div>
                                    <div style={{ width: '15%', textAlign: 'center' }}>{addon.quantity}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>{addon.addon.price.toFixed(2)}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>
                                        {(addon.addon.price * addon.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            {/* Totals Section */}
            <div style={{ borderTop: '1px dashed black', paddingTop: '6px', fontSize: sizes.base }}>
                {/* Total Qty and Sub Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Total Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    <span>Sub Total</span>
                    <span>{subtotal.toFixed(2)}</span>
                </div>

                {/* Discount - Strict Visibility */}
                {isDiscountEnabled && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Discount{order.discount ? ` (${order.discount})` : ''}:</span>
                        <span>- {discountAmount.toFixed(2)}</span>
                    </div>
                )}

                {/* Tax Breakdown - Strict Visibility */}
                {isTaxEnabled && taxAmount > 0 && (
                    <>
                        {businessDetails?.taxName && businessDetails.taxName.toLowerCase().includes('gst') ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                                    <span>{(taxAmount / 2).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                                    <span>{(taxAmount / 2).toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{businessDetails?.taxName || 'Tax'} ({taxRate}%):</span>
                                <span>{taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Grand Total - Prominent */}
            <div style={{
                borderTop: '2px dashed black',
                borderBottom: '2px dashed black',
                marginTop: '6px',
                paddingTop: '8px',
                paddingBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: sizes.subheader, fontWeight: '700' }}>Grand Total</span>
                <span style={{ fontSize: sizes.total, fontWeight: '700' }}>₹{Math.round(finalTotal).toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: sizes.base }}>
                {printerSettings?.footerText ? (
                    <div style={{ fontWeight: 'bold' }}>{printerSettings.footerText}</div>
                ) : (
                    <div style={{ fontWeight: 'bold' }}>Thanks</div>
                )}

                {printerSettings?.enableQrCode && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                        <div style={{ border: '1px solid black', padding: '4px', fontSize: '10px' }}>
                            Scan to Pay
                        </div>
                    </div>
                )}

                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Powered by SyncServe POS</div>
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
