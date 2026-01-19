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
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(({ order, businessDetails, storeDetails }, ref) => {
    // Calculate defaults if not provided (fallback logic)
    const calculatedSubtotal = order.items.reduce((sum, item) => {
        const itemTotal = item.unitPrice * item.quantity;
        const addonTotal = item.addons ? item.addons.reduce((acc: number, addon: any) => acc + (addon.addon.price * addon.quantity), 0) : 0;
        return sum + itemTotal + addonTotal;
    }, 0);

    const subtotal = order.subtotal ?? calculatedSubtotal;

    // Improved Discount Logic: Only apply if enabled
    const isDiscountEnabled = businessDetails?.enableDiscount === true;
    let discountAmount = order.discountAmount ?? 0;

    if (isDiscountEnabled && !discountAmount && order.discount) {
        // If order.discount is just a number string '10', treat as fixed amount.
        discountAmount = parseFloat(order.discount.toString());
    } else if (!isDiscountEnabled) {
        discountAmount = 0;
    }

    // Improved Tax Logic: Only calculate if enabled
    let taxAmount = order.taxAmount ?? 0;
    const taxRate = businessDetails?.taxRate ? parseFloat(businessDetails.taxRate.toString()) : 0;
    const isTaxEnabled = businessDetails?.showTaxBreakdown === true;

    // Recalculate tax ONLY if enabled and missing
    if (isTaxEnabled && !order.taxAmount && taxRate > 0) {
        taxAmount = (subtotal * taxRate) / 100
    } else if (!isTaxEnabled) {
        // Force tax to 0 if disabled, just in case
        taxAmount = 0;
    }

    const finalTotal = subtotal + taxAmount - discountAmount;

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

    return (
        <div ref={ref} className="hidden print:block bg-white text-black font-mono text-xs leading-tight" style={{ width: '80mm', padding: '10px', boxSizing: 'border-box' }}>
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

                <h1 className="text-xl font-bold uppercase tracking-wider mb-1">{storeDetails?.name || businessDetails?.name || 'TechSonance'}</h1>

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
                <div style={{ width: '45%' }}>Item</div>
                <div style={{ width: '15%', textAlign: 'center' }}>Qty</div>
                <div style={{ width: '20%', textAlign: 'right' }}>Price</div>
                <div style={{ width: '20%', textAlign: 'right' }}>Amt</div>
            </div>

            {/* Items List */}
            <div className="mb-2 space-y-1">
                {order.items.map((item, index) => {
                    const itemTotal = item.unitPrice * item.quantity;
                    return (
                        <div key={index}>
                            <div className="flex text-[11px]">
                                <div style={{ width: '45%' }} className="truncate font-medium">{item.name}</div>
                                <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                                <div style={{ width: '20%', textAlign: 'right' }}>{item.unitPrice}</div>
                                <div style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>
                                    {itemTotal.toFixed(2)}
                                </div>
                            </div>
                            {/* Addons */}
                            {item.addons && item.addons.length > 0 && item.addons.map((addon: any, idx: number) => (
                                <div key={idx} className="flex text-[10px] text-gray-600" style={{ paddingLeft: '8px' }}>
                                    <div style={{ width: '45%' }}>+ {addon.addon.name}</div>
                                    <div style={{ width: '15%', textAlign: 'center' }}>{addon.quantity}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>{addon.addon.price}</div>
                                    <div style={{ width: '20%', textAlign: 'right' }}>
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

                {/* Discount */}
                {isDiscountEnabled && discountAmount > 0 && (
                    <div className="flex justify-between">
                        <span>
                            Discount
                            {order.discount ? ` (${order.discount})` : ''}:
                        </span>
                        <span>- {discountAmount.toFixed(2)}</span>
                    </div>
                )}

                {/* Tax - show only if enabled */}
                {isTaxEnabled && (
                    <div className="flex justify-between">
                        <span>
                            {businessDetails?.taxName || 'Tax'}
                            {taxRate > 0 ? ` (${taxRate}%)` : ''}
                        </span>
                        <span>{taxAmount.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between border-b border-dashed border-black pb-1 mb-1">
                    <span>Payment Mode:</span>
                    <span>{order.paymentMode || 'CASH'}</span>
                </div>

                <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total:</span>
                    <span>₹{finalTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 border-t border-black border-dashed pt-2">
                <p className="font-bold">Thank you for visiting!</p>
                <p className="text-[10px] mt-1">Powered by TechSonance POS</p>
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
