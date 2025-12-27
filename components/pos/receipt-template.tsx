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
    const taxAmount = order.taxAmount ?? (order.totalAmount - subtotal); // Approximation if missing

    return (
        <div ref={ref} className="hidden print:block print:w-[80mm] print:p-2 bg-white text-black font-mono text-sm leading-tight">
            {/* Header */}
            {/* Header */}
            <div className="text-center mb-4 border-b border-black pb-2 border-dashed flex flex-col items-center justify-center">
                <h1 className="text-xl font-bold uppercase tracking-wider">{storeDetails?.name || businessDetails?.name || 'TechSonance'}</h1>
                {storeDetails?.location && <p className="text-xs whitespace-pre-wrap px-4 font-medium">{storeDetails.location}</p>}
                {!storeDetails?.location && businessDetails?.address && <p className="text-xs whitespace-pre-wrap px-4">{businessDetails.address}</p>}

                {storeDetails?.contactNo && <p className="text-xs mt-1">Ph: {storeDetails.contactNo}</p>}
                {!storeDetails?.contactNo && businessDetails?.phone && <p className="text-xs mt-1">Ph: {businessDetails.phone}</p>}

                {businessDetails?.email && <p className="text-xs">Email: {businessDetails.email}</p>}
            </div>

            {/* Order Info */}
            <div className="mb-4 text-xs">
                <div className="flex justify-between">
                    <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between font-bold mt-1">
                    <span>Bill No: {order.kotNo}</span>
                </div>
                {order.tableName && (
                    <div className="mt-1">Table: {order.tableName}</div>
                )}
                {order.customerName && (
                    <div className="mt-1 border-t border-dashed border-black pt-1">
                        Customer: {order.customerName} <br />
                        {order.customerMobile && <span>Ph: {order.customerMobile}</span>}
                    </div>
                )}
            </div>

            {/* Items Header */}
            <div className="border-b border-black border-dashed mb-2 pb-1 flex text-xs font-bold uppercase">
                <div className="w-[45%]">Item</div>
                <div className="w-[15%] text-center">Qty</div>
                <div className="w-[20%] text-right">Price</div>
                <div className="w-[20%] text-right">Amt</div>
            </div>

            {/* Items List */}
            <div className="mb-4 space-y-1">
                {order.items.map((item, index) => (
                    <div key={index}>
                        <div className="flex text-xs">
                            <div className="w-[45%] truncate font-medium">{item.name}</div>
                            <div className="w-[15%] text-center">{item.quantity}</div>
                            <div className="w-[20%] text-right">{item.unitPrice}</div>
                            <div className="w-[20%] text-right font-semibold">
                                {(item.unitPrice * item.quantity).toFixed(0)}
                            </div>
                        </div>
                        {/* Addons */}
                        {item.addons && item.addons.length > 0 && item.addons.map((addon: any, idx: number) => (
                            <div key={idx} className="flex text-[10px] text-gray-600 pl-2">
                                <div className="w-[45%]">+ {addon.addon.name}</div>
                                <div className="w-[15%] text-center">{addon.quantity}</div>
                                <div className="w-[20%] text-right">{addon.addon.price}</div>
                                <div className="w-[20%] text-right">
                                    {(addon.addon.price * addon.quantity).toFixed(0)}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{subtotal.toFixed(2)}</span>
                </div>

                {businessDetails?.showTaxBreakdown && (
                    <div className="flex justify-between">
                        <span>{businessDetails.taxName || 'Tax'} ({businessDetails.taxRate || 5}%):</span>
                        <span>{taxAmount.toFixed(2)}</span>
                    </div>
                )}

                {order.discountAmount && order.discountAmount > 0 && (
                    <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>- {Number(order.discountAmount).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <span>{order.paymentMode || 'CASH'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-2 border-dashed">
                    <span>Total:</span>
                    <span>₹{order.totalAmount.toFixed(0)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 border-t border-black border-dashed pt-4">
                <p className="text-xs font-semibold">Thank you for visiting!</p>
                <p className="text-[10px] mt-1">Powered by TechSonance POS</p>
            </div>
        </div>
    )
})

ReceiptTemplate.displayName = "ReceiptTemplate"
