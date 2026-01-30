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

    // Tax Logic
    const isTaxEnabled = businessDetails?.showTaxBreakdown === true
    const taxRate = businessDetails?.taxRate ? parseFloat(businessDetails.taxRate.toString()) : 0
    let taxAmount = order.taxAmount ?? 0
    if (!isTaxEnabled) taxAmount = 0

    // Discount Calculation
    let discountAmount = order.discountAmount ?? 0
    if (subtotal < minOrderForDiscount) discountAmount = 0
    if (maxDiscountVal > 0 && discountAmount > maxDiscountVal) discountAmount = maxDiscountVal
    if (!isDiscountEnabled) discountAmount = 0

    const finalTotal = subtotal + taxAmount - discountAmount

    // Date Format: DD/MM/YYYY
    const formatDate = (date: Date | string) => {
        try {
            return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
        } catch (e) { return String(date) }
    };

    // Time Format: HH:mm AM/PM
    const formatTime = (date: Date | string) => {
        try {
            return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        } catch (e) { return '' }
    };

    // Printer Settings Logic
    const paperWidth = printerSettings?.paperWidth ? parseInt(printerSettings.paperWidth.toString()) : 80

    // TYPOGRAPHY CONFIG - MAX VISIBILITY
    const fontSize = printerSettings?.fontSize || 'medium'
    const fontSizeStyles = {
        small: { base: '14px', header: '20px', subheader: '16px', total: '22px' },
        medium: { base: '16px', header: '24px', subheader: '18px', total: '26px' },
        large: { base: '18px', header: '28px', subheader: '20px', total: '30px' }
    }
    const sizes = fontSizeStyles[fontSize as keyof typeof fontSizeStyles] || fontSizeStyles.medium

    // Helper for Bold Rows
    const BoldRow = ({ label, value, size = sizes.base }: { label: string, value: string | number, size?: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size, fontWeight: '800', marginBottom: '4px' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )

    return (
        <div
            ref={ref}
            style={{
                width: '100%',
                minWidth: `${paperWidth}mm`,
                padding: '4mm',
                margin: '0 auto',
                backgroundColor: 'white',
                color: '#000000',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: sizes.base,
                fontWeight: '700', // Base Bold
                lineHeight: '1.2',
                boxSizing: 'border-box',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'none' // Crisp pixels for thermal
            }}
        >
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px dashed black', paddingBottom: '8px' }}>
                {businessDetails?.logoUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <img
                            src={businessDetails.logoUrl}
                            alt="Logo"
                            style={{ height: '60px', width: 'auto', maxWidth: '80%', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)' }}
                        />
                    </div>
                )}

                {/* Outlet Name - Extra Large & Bold */}
                <div style={{ fontSize: sizes.header, fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                    {storeDetails?.name || businessDetails?.name || 'SyncServe'}
                </div>

                {/* Location - Bold */}
                {storeDetails?.location ? (
                    <div style={{ fontSize: sizes.subheader, fontWeight: '800' }}>{storeDetails.location}</div>
                ) : (
                    businessDetails?.address && <div style={{ fontSize: sizes.subheader, fontWeight: '800' }}>{businessDetails.address}</div>
                )}

                {/* Phone - Bold */}
                {(storeDetails?.contactNo || businessDetails?.phone) && (
                    <div style={{ fontSize: sizes.subheader, fontWeight: '800', marginTop: '2px' }}>
                        Ph: {storeDetails?.contactNo || businessDetails?.phone}
                    </div>
                )}

                {/* GST Invoice Label - Force Show if Tax Enabled */}
                {isTaxEnabled && (
                    <div style={{ marginTop: '6px', fontWeight: '900', textTransform: 'uppercase', fontSize: sizes.subheader, border: '2px dashed black', display: 'inline-block', padding: '2px 8px' }}>
                        GST INVOICE
                    </div>
                )}
            </div>

            {/* Meta Info Section - Reordered & Bold */}
            <div style={{ borderBottom: '2px dashed black', paddingBottom: '8px', marginBottom: '8px' }}>

                {/* Row 1: Date/Time (Left) | Table/Counter (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '800' }}>
                    <span>Date: {formatDate(order.createdAt)} {formatTime(order.createdAt)}</span>
                    <span style={{ textTransform: 'uppercase' }}>
                        {order.tableName ? `Dine In: ${order.tableName}` : 'Counter'}
                    </span>
                </div>

                {/* Row 2: Cashier | Bill No */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '800' }}>
                    <span>Cashier: biller</span>
                    <span style={{ fontSize: sizes.subheader }}>Bill No: {order.kotNo.replace(/^KOT/i, '')}</span>
                </div>

                {/* Row 3: Customer Name (Restored Here) */}
                <div style={{ marginTop: '4px', fontWeight: '800', fontSize: sizes.subheader }}>
                    Name: {order.customerName || 'Walk-in'}
                </div>
            </div>

            {/* Items Header - Solid Line */}
            <div style={{
                display: 'flex',
                fontWeight: '900',
                fontSize: sizes.subheader,
                borderBottom: '2px dashed black',
                paddingBottom: '4px',
                marginBottom: '6px'
            }}>
                <div style={{ width: '45%' }}>ITEM</div>
                <div style={{ width: '15%', textAlign: 'center' }}>QTY</div>
                <div style={{ width: '20%', textAlign: 'right' }}>PRICE</div>
                <div style={{ width: '20%', textAlign: 'right' }}>AMT</div>
            </div>

            {/* Items List */}
            <div style={{ marginBottom: '10px' }}>
                {order.items.map((item, index) => {
                    const itemTotal = item.unitPrice * item.quantity;
                    return (
                        <div key={index} style={{ marginBottom: '6px', fontWeight: '700' }}>
                            <div style={{ display: 'flex', fontSize: sizes.base }}>
                                <div style={{ width: '45%' }}>{item.name}</div>
                                <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                                <div style={{ width: '20%', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</div>
                                <div style={{ width: '20%', textAlign: 'right', fontWeight: '800' }}>{itemTotal.toFixed(2)}</div>
                            </div>
                            {/* Addons */}
                            {item.addons && item.addons.length > 0 && item.addons.map((addon: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', fontSize: '0.9em', paddingLeft: '8px', marginTop: '2px', fontStyle: 'italic' }}>
                                    <div style={{ width: '45%' }}>+ {addon.addon.name}</div>
                                    <div style={{ width: '15%', textAlign: 'center' }}>{addon.quantity}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>{addon.addon.price.toFixed(2)}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>{(addon.addon.price * addon.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            {/* Totals Section - All Bold */}
            <div style={{ borderTop: '2px dashed black', paddingTop: '8px', fontSize: sizes.base }}>

                {/* Unified Line: Total Qty and Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Total Qty:</span>
                        <span style={{ fontWeight: 'bold' }}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Sub Total</span>
                        <span style={{ fontWeight: 'bold' }}>{subtotal.toFixed(2)}</span>
                    </div>
                </div>

                {isDiscountEnabled && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '800' }}>
                        <span>Discount ({order.discount || ''}):</span>
                        <span>- {discountAmount.toFixed(2)}</span>
                    </div>
                )}

                {isTaxEnabled && taxAmount > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                        {(businessDetails?.taxName || 'GST').toUpperCase().includes('GST') ? (
                            <>
                                <BoldRow label={`CGST (${(taxRate / 2).toFixed(1)}%):`} value={(taxAmount / 2).toFixed(2)} />
                                <BoldRow label={`SGST (${(taxRate / 2).toFixed(1)}%):`} value={(taxAmount / 2).toFixed(2)} />
                            </>
                        ) : (
                            <BoldRow label={`${businessDetails?.taxName || 'Tax'} (${taxRate}%):`} value={taxAmount.toFixed(2)} />
                        )}
                    </div>
                )}

                <BoldRow label="Payment Mode:" value={order.paymentMode || 'CASH'} />
            </div>

            {/* Grand Total - Block Style */}
            <div style={{
                borderTop: '2px dashed black',
                borderBottom: '2px dashed black',
                marginTop: '8px',
                padding: '8px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: sizes.header, fontWeight: '900', textTransform: 'uppercase' }}>TOTAL</span>
                <span style={{ fontSize: sizes.total, fontWeight: '900' }}>₹{Math.round(finalTotal).toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <div style={{ fontWeight: '900', fontSize: sizes.subheader, marginBottom: '6px' }}>Thank you for visiting!</div>

                {printerSettings?.enableQrCode && (
                    <div style={{ margin: '8px auto', width: 'fit-content', border: '3px solid black', padding: '6px' }}>
                        [QR CODE]
                    </div>
                )}

                <div style={{ fontSize: '12px', marginTop: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Powered by SyncServe POS
                </div>
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
