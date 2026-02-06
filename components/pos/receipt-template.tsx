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

    // TYPOGRAPHY CONFIG - Thermal Printer Optimized (Sans-Serif, Bold weights)
    // Exact specs: Header 16-18pt Bold, Address 10-11pt SemiBold, Title 13-14pt Bold
    // Meta 9.5-10pt SemiBold, Item 10-11pt SemiBold, Qty 9.5-10pt Bold
    // Subtotal 10-11pt SemiBold, Total 14-16pt ExtraBold, Payment 10pt Bold, Footer 9-9.5pt SemiBold
    const fontSize = printerSettings?.fontSize || 'medium'
    const fontSizeStyles = {
        small: {
            base: '12px',       // ~9pt - minimum safe for body
            header: '21px',     // ~16pt Bold/ExtraBold - store name
            subheader: '13px',  // ~10pt SemiBold - address/contact
            title: '17px',      // ~13pt Bold - GST Invoice
            meta: '12px',       // ~9.5pt SemiBold - date/time/bill
            item: '13px',       // ~10pt SemiBold - item names
            qty: '12px',        // ~9.5pt Bold - qty/rate columns
            subtotal: '13px',   // ~10pt SemiBold - subtotal/tax/discount
            total: '18px',      // ~14pt ExtraBold - grand total
            payment: '13px',    // ~10pt Bold - payment method
            footer: '12px'      // ~9pt SemiBold - footer text
        },
        medium: {
            base: '13px',       // ~10pt - body text
            header: '24px',     // ~18pt Bold/ExtraBold - store name
            subheader: '14px',  // ~11pt SemiBold - address/contact
            title: '18px',      // ~14pt Bold - GST Invoice
            meta: '13px',       // ~10pt SemiBold - date/time/bill
            item: '14px',       // ~11pt SemiBold - item names
            qty: '13px',        // ~10pt Bold - qty/rate columns
            subtotal: '14px',   // ~11pt SemiBold - subtotal/tax/discount
            total: '21px',      // ~16pt ExtraBold - grand total
            payment: '13px',    // ~10pt Bold - payment method
            footer: '12px'      // ~9.5pt SemiBold - footer text
        },
        large: {
            base: '14px',       // ~11pt - body text
            header: '28px',     // ~21pt Bold/ExtraBold - store name
            subheader: '16px',  // ~12pt SemiBold - address/contact
            title: '21px',      // ~16pt Bold - GST Invoice
            meta: '14px',       // ~11pt SemiBold - date/time/bill
            item: '16px',       // ~12pt SemiBold - item names
            qty: '14px',        // ~11pt Bold - qty/rate columns
            subtotal: '16px',   // ~12pt SemiBold - subtotal/tax/discount
            total: '24px',      // ~18pt ExtraBold - grand total
            payment: '14px',    // ~11pt Bold - payment method
            footer: '13px'      // ~10pt SemiBold - footer text
        }
    }
    const sizes = fontSizeStyles[fontSize as keyof typeof fontSizeStyles] || fontSizeStyles.medium

    // Helper for SemiBold Rows (Subtotal/Tax/Discount - 10-11pt SemiBold)
    const SemiBoldRow = ({ label, value, size = sizes.subtotal }: { label: string, value: string | number, size?: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size, fontWeight: '600', marginBottom: '4px' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )

    // Helper for Payment Row (10pt Bold)
    const PaymentRow = ({ label, value }: { label: string, value: string | number }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: sizes.payment, fontWeight: '700', marginBottom: '4px' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )

    return (
        <div
            ref={ref}
            style={{
                width: `${paperWidth}mm`,
                maxWidth: `${paperWidth}mm`,
                minWidth: `${paperWidth}mm`,
                padding: '0 5mm', // Reduced side padding for thermal
                paddingTop: 0,
                paddingBottom: '2mm',
                margin: 0, // No margin - eliminates white space at top
                marginTop: 0,
                backgroundColor: 'white',
                color: '#000000',
                fontFamily: 'Roboto, Arial, Helvetica, "Noto Sans", sans-serif',
                fontSize: sizes.base,
                fontWeight: '600', // SemiBold baseline for thermal
                lineHeight: '1.2',
                boxSizing: 'border-box',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'none', // Crisp pixels for thermal
                MozOsxFontSmoothing: 'grayscale'
            }}
        >
            {/* 🏪 Header Section - 16-18pt Bold/ExtraBold, line-height 1.25 */}
            <div style={{ textAlign: 'center', marginTop: 0, paddingTop: 0, marginBottom: '8px', borderBottom: '2px solid black', paddingBottom: '8px', lineHeight: '1.25' }}>
                {businessDetails?.logoUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <img
                            src={businessDetails.logoUrl}
                            alt="Logo"
                            style={{ height: '60px', width: 'auto', maxWidth: '80%', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)' }}
                        />
                    </div>
                )}

                {/* 🏪 Outlet Name - 16-18pt Bold/ExtraBold */}
                <div style={{ fontSize: sizes.header, fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                    {storeDetails?.name || businessDetails?.name || 'SyncServe'}
                </div>

                {/* 📍 Location - 10-11pt SemiBold, line-height 1.15 */}
                {storeDetails?.location ? (
                    <div style={{ fontSize: sizes.subheader, fontWeight: '600', lineHeight: '1.15' }}>{storeDetails.location}</div>
                ) : (
                    businessDetails?.address && <div style={{ fontSize: sizes.subheader, fontWeight: '600', lineHeight: '1.15' }}>{businessDetails.address}</div>
                )}

                {/* 📍 Phone - 10-11pt SemiBold */}
                {(storeDetails?.contactNo || businessDetails?.phone) && (
                    <div style={{ fontSize: sizes.subheader, fontWeight: '600', marginTop: '2px', lineHeight: '1.15' }}>
                        Ph: {storeDetails?.contactNo || businessDetails?.phone}
                    </div>
                )}

                {/* 🧾 GST Invoice Label - 13-14pt Bold, UPPERCASE */}
                {isTaxEnabled && (
                    <div style={{ marginTop: '6px', fontWeight: '700', textTransform: 'uppercase', fontSize: sizes.title, border: '2px solid black', display: 'inline-block', padding: '2px 8px' }}>
                        GST INVOICE
                    </div>
                )}
            </div>

            {/* 📅 Meta Info Section - 9.5-10pt SemiBold */}
            <div style={{ borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '8px' }}>

                {/* Row 1: Date/Time (Left) | Table/Counter (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '600', fontSize: sizes.meta }}>
                    <span>Date: {formatDate(order.createdAt)} {formatTime(order.createdAt)}</span>
                    <span style={{ textTransform: 'uppercase' }}>
                        {order.tableName ? `Dine In: ${order.tableName}` : 'Counter'}
                    </span>
                </div>

                {/* Row 2: Cashier | Bill No */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '600', fontSize: sizes.meta }}>
                    <span>Cashier: biller</span>
                    <span style={{ fontSize: sizes.meta, fontWeight: '600' }}>Bill No: {order.kotNo.replace(/^KOT/i, '')}</span>
                </div>

                {/* Row 3: Customer Name (Restored Here) */}
                <div style={{ marginTop: '4px', fontWeight: '600', fontSize: sizes.meta }}>
                    Name: {order.customerName || 'Walk-in'}
                </div>
            </div>

            {/* 🛒 Items Header - 10-11pt SemiBold, Bold separator */}
            <div style={{
                display: 'flex',
                fontWeight: '600',
                fontSize: sizes.item,
                borderBottom: '2px solid black',
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
                            <div style={{ display: 'flex', fontSize: sizes.item, fontWeight: '600' }}>
                                <div style={{ width: '45%' }}>{item.name}</div>
                                <div style={{ width: '15%', textAlign: 'center', fontSize: sizes.qty, fontWeight: '700' }}>{item.quantity}</div>
                                <div style={{ width: '20%', textAlign: 'right', fontSize: sizes.qty, fontWeight: '700' }}>{item.unitPrice.toFixed(2)}</div>
                                <div style={{ width: '20%', textAlign: 'right', fontSize: sizes.qty, fontWeight: '700' }}>{itemTotal.toFixed(2)}</div>
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

            {/* 💰 Totals Section - 10-11pt SemiBold */}
            <div style={{ borderTop: '2px solid black', paddingTop: '8px', fontSize: sizes.subtotal }}>

                {/* Unified Line: Total Qty and Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: '600' }}>Total Qty:</span>
                        <span style={{ fontWeight: '600' }}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: '600' }}>Sub Total</span>
                        <span style={{ fontWeight: '600' }}>{subtotal.toFixed(2)}</span>
                    </div>
                </div>

                {isDiscountEnabled && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '600' }}>
                        <span>Discount ({order.discount || ''}):</span>
                        <span>- {discountAmount.toFixed(2)}</span>
                    </div>
                )}

                {isTaxEnabled && taxAmount > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                        {(businessDetails?.taxName || 'GST').toUpperCase().includes('GST') ? (
                            <>
                                <SemiBoldRow label={`CGST (${(taxRate / 2).toFixed(1)}%):`} value={(taxAmount / 2).toFixed(2)} />
                                <SemiBoldRow label={`SGST (${(taxRate / 2).toFixed(1)}%):`} value={(taxAmount / 2).toFixed(2)} />
                            </>
                        ) : (
                            <SemiBoldRow label={`${businessDetails?.taxName || 'Tax'} (${taxRate}%):`} value={taxAmount.toFixed(2)} />
                        )}
                    </div>
                )}

                {/* 💳 Payment Method - 10pt Bold */}
                <PaymentRow label="Payment Mode:" value={order.paymentMode || 'CASH'} />
            </div>

            {/* 💵 Grand Total - 14-16pt ExtraBold */}
            <div style={{
                borderTop: '2px solid black',
                borderBottom: '2px solid black',
                marginTop: '8px',
                padding: '8px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: sizes.title, fontWeight: '800', textTransform: 'uppercase' }}>TOTAL</span>
                <span style={{ fontSize: sizes.total, fontWeight: '800' }}>₹{Math.round(finalTotal).toFixed(2)}</span>
            </div>

            {/* 🔁 Footer - 9-9.5pt SemiBold, line-height 1.15 */}
            <div style={{ textAlign: 'center', marginTop: '15px', lineHeight: '1.15' }}>
                <div style={{ fontWeight: '600', fontSize: sizes.footer, marginBottom: '6px' }}>Thank you for visiting!</div>

                {printerSettings?.enableQrCode && (
                    <div style={{ margin: '8px auto', width: 'fit-content', border: '3px solid black', padding: '6px' }}>
                        [QR CODE]
                    </div>
                )}

                <div style={{ fontSize: sizes.footer, marginTop: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Powered by SyncServe POS
                </div>
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
