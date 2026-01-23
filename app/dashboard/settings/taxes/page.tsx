"use client"

import { useState, useEffect, useMemo } from "react"
import { Home, Receipt, Save, Info, Calculator } from "lucide-react"
import { getBusinessSettings, updateBusinessSettings } from "@/app/actions/settings"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TaxesLoading from "./loading"

// Sample order items for preview
const SAMPLE_ITEMS = [
    { name: "Margherita Pizza", price: 299, qty: 2 },
    { name: "Garlic Bread", price: 149, qty: 1 },
    { name: "Coke (330ml)", price: 60, qty: 2 }
]

export default function TaxConfigurationPage() {
    const { currency } = useCurrency()
    const [taxRate, setTaxRate] = useState("5")
    const [taxName, setTaxName] = useState("GST")
    const [showBreakdown, setShowBreakdown] = useState(true)
    const [enableDiscount, setEnableDiscount] = useState(false)
    const [defaultDiscount, setDefaultDiscount] = useState("0")
    const [discountType, setDiscountType] = useState("FIXED")
    const [minOrderForDiscount, setMinOrderForDiscount] = useState("0")
    const [maxDiscount, setMaxDiscount] = useState("0")
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const settings = await getBusinessSettings() as {
                businessName: string; logoUrl: string; address: string; phone: string;
                email: string; gstNo: string; taxRate: string; taxName: string;
                showTaxBreakdown: boolean; enableDiscount: boolean; defaultDiscount: string;
                discountType: string; minOrderForDiscount: string; maxDiscount: string;
            }
            setTaxRate(settings.taxRate || "5")
            setTaxName(settings.taxName || "GST")
            setShowBreakdown(settings.showTaxBreakdown !== false)
            setEnableDiscount(settings.enableDiscount === true)
            setDefaultDiscount(settings.defaultDiscount || "0")
            setDiscountType(settings.discountType || "FIXED")
            setMinOrderForDiscount(settings.minOrderForDiscount || "0")
            setMaxDiscount(settings.maxDiscount || "0")
        } catch (error) {
            console.warn("Tax config: Server fetch failed, using local settings", error)
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const posService = getPOSService()
                const localSettings = await posService.getSettings()
                const getSetting = (key: string, defaultVal: string) =>
                    localSettings.find(s => s.key === key)?.value ?? defaultVal

                setTaxRate(getSetting('setting_taxRate', '5'))
                setTaxName(getSetting('setting_taxName', 'GST'))
                setShowBreakdown(getSetting('setting_showTaxBreakdown', 'true') === 'true')
                setEnableDiscount(getSetting('setting_enableDiscount', 'false') === 'true')
                setDefaultDiscount(getSetting('setting_defaultDiscount', '0'))
                setDiscountType(getSetting('setting_discountType', 'FIXED'))
                setDiscountType(getSetting('setting_discountType', 'FIXED'))
                setMinOrderForDiscount(getSetting('setting_minOrderForDiscount', '0'))
                setMaxDiscount(getSetting('setting_maxDiscount', '0'))
            } catch (innerError) {
                console.error("Failed to load local tax settings", innerError)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const currentSettings = await getBusinessSettings() as {
                businessName: string; logoUrl: string; address: string; phone: string;
                email: string; gstNo: string; taxRate: string; taxName: string;
                showTaxBreakdown: boolean; enableDiscount: boolean; defaultDiscount: string;
                discountType: string; minOrderForDiscount: string; maxDiscount: string;
            }

            const fullFormData = new FormData()
            fullFormData.append('businessName', currentSettings.businessName || '')
            fullFormData.append('address', currentSettings.address || '')
            fullFormData.append('phone', currentSettings.phone || '')
            fullFormData.append('email', currentSettings.email || '')
            fullFormData.append('gstNo', currentSettings.gstNo || '')
            fullFormData.append('taxRate', taxRate)
            fullFormData.append('taxName', taxName)
            fullFormData.append('showTaxBreakdown', String(showBreakdown))
            fullFormData.append('enableDiscount', String(enableDiscount))
            fullFormData.append('defaultDiscount', defaultDiscount)
            fullFormData.append('discountType', discountType)
            fullFormData.append('minOrderForDiscount', minOrderForDiscount)
            fullFormData.append('maxDiscount', maxDiscount)

            const result = await updateBusinessSettings(null, fullFormData)
            if (result.success) {
                toast.success("Tax settings saved successfully")
            } else {
                toast.error("Failed to save settings")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setSaving(false)
        }
    }

    // Calculate preview values - Standard: Subtotal → Discount → Taxable Amount → GST → Total
    const preview = useMemo(() => {
        const rate = parseFloat(taxRate) || 0
        const discountVal = parseFloat(defaultDiscount) || 0
        const minOrder = parseFloat(minOrderForDiscount) || 0

        // Step 1: Subtotal from sample items
        const subtotal = SAMPLE_ITEMS.reduce((sum, item) => sum + (item.price * item.qty), 0)

        // Step 2: Calculate discount on subtotal (only if above min order)
        let discountAmount = 0
        const isDiscountEligible = enableDiscount && discountVal > 0 && subtotal >= minOrder
        if (isDiscountEligible) {
            if (discountType === 'PERCENTAGE') {
                const calculatedDiscount = (subtotal * discountVal) / 100
                const maxDisc = parseFloat(maxDiscount) || 0
                // Apply cap if maxDiscount is set (>0)
                discountAmount = Math.round(maxDisc > 0 ? Math.min(calculatedDiscount, maxDisc) : calculatedDiscount)
            } else {
                discountAmount = Math.round(discountVal)
            }
        }

        // Step 3: Taxable Amount (after discount)
        const taxableAmount = subtotal - discountAmount

        // Step 4: GST calculation on taxable amount (split into CGST and SGST)
        const totalGst = (taxableAmount * rate) / 100
        const cgst = totalGst / 2
        const sgst = totalGst / 2

        // Step 5: Final total (rounded)
        const total = Math.round(taxableAmount + totalGst)

        return {
            subtotal,
            discountAmount,
            taxableAmount,
            cgst,
            sgst,
            totalGst,
            total,
            cgstRate: rate / 2,
            sgstRate: rate / 2,
            isDiscountEligible,
            minOrder
        }
    }, [taxRate, enableDiscount, defaultDiscount, discountType, minOrderForDiscount, maxDiscount])

    if (loading) return <TaxesLoading />

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit animate-in fade-in slide-in-from-top-2">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">More Options</Link>
                <span>/</span>
                <span className="font-medium text-orange-600">Tax Configuration</span>
            </div>

            {/* Back Link */}
            <div>

                <h1 className="text-3xl font-bold text-gray-900">Tax Configuration</h1>
                <p className="text-gray-500 mt-2 text-lg">Manage your tax rates and billing preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left: Settings Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Tax Settings</h2>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Tax Name</Label>
                            <Input
                                placeholder="e.g. GST, VAT"
                                value={taxName}
                                onChange={(e) => setTaxName(e.target.value)}
                                className="h-12 text-lg"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Total Tax Rate (%)</Label>
                            <Input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="h-12 text-lg"
                            />
                            {/* CGST/SGST Breakdown Info */}
                            {taxName.toLowerCase().includes('gst') && parseFloat(taxRate) > 0 && (
                                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                                    <div className="text-sm text-green-800">
                                        <span className="font-semibold">CGST:</span> {(parseFloat(taxRate) / 2).toFixed(2)}%
                                    </div>
                                    <div className="h-4 w-px bg-green-200" />
                                    <div className="text-sm text-green-800">
                                        <span className="font-semibold">SGST:</span> {(parseFloat(taxRate) / 2).toFixed(2)}%
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                            <Label className="text-gray-700 cursor-pointer" htmlFor="breakdown">Show tax breakdown in bill</Label>
                            <Switch
                                id="breakdown"
                                checked={showBreakdown}
                                onCheckedChange={setShowBreakdown}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 mt-6 border-t border-gray-100 max-w-md">
                        <h3 className="font-semibold text-gray-900">Discount Settings</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                <Label className="text-gray-700 cursor-pointer" htmlFor="discount">Enable discount</Label>
                                <Switch
                                    id="discount"
                                    checked={enableDiscount}
                                    onCheckedChange={setEnableDiscount}
                                />
                            </div>
                            {enableDiscount && (
                                <>
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-gray-700 font-medium">Discount Type</Label>
                                        <Select value={discountType} onValueChange={setDiscountType}>
                                            <SelectTrigger className="h-12 text-lg">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                                                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-medium">
                                            Default Discount {discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}
                                        </Label>
                                        <Input
                                            type="number"
                                            value={defaultDiscount}
                                            onChange={(e) => setDefaultDiscount(e.target.value)}
                                            className="h-12 text-lg"
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-gray-500">
                                            {discountType === 'FIXED'
                                                ? "Fixed amount will be deducted from subtotal before GST calculation."
                                                : "Percentage will be calculated on subtotal, then GST is applied on the discounted amount."}
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-medium">
                                            Minimum Order Amount (₹)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={minOrderForDiscount}
                                            onChange={(e) => setMinOrderForDiscount(e.target.value)}
                                            className="h-12 text-lg"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Discount will only apply when order subtotal is at or above this amount. Set to 0 for no minimum.
                                        </p>
                                    </div>

                                    {discountType === 'PERCENTAGE' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-gray-700 font-medium">
                                                Maximum Discount Amount (₹)
                                            </Label>
                                            <Input
                                                type="number"
                                                value={maxDiscount}
                                                onChange={(e) => setMaxDiscount(e.target.value)}
                                                className="h-12 text-lg"
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Cap the percentage discount to this maximum amount. Set to 0 for no limit.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview Panel */}
                <div className="space-y-6">
                    {/* Tax Info Card */}
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
                        <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Tax Information
                        </h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p>• Tax Rate: <span className="font-bold">{taxRate}%</span> ({taxName})</p>
                            {taxName.toLowerCase().includes('gst') && (
                                <>
                                    <p className="pl-3">↳ CGST: <span className="font-semibold">{(parseFloat(taxRate) / 2).toFixed(2)}%</span></p>
                                    <p className="pl-3">↳ SGST: <span className="font-semibold">{(parseFloat(taxRate) / 2).toFixed(2)}%</span></p>
                                </>
                            )}
                            <p>• Tax is applied at checkout automatically.</p>
                        </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Calculator className="h-4 w-4" /> Live Preview
                            </h3>
                            <p className="text-orange-100 text-xs">Sample order calculation</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Sample Items */}
                            <div className="space-y-2">
                                {SAMPLE_ITEMS.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{item.name} × {item.qty}</span>
                                        <span className="font-medium">₹{(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                                {/* Step 1: Subtotal */}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">₹{preview.subtotal.toFixed(2)}</span>
                                </div>

                                {/* Step 2: Discount (applied before GST) */}
                                {enableDiscount && preview.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span>
                                            Discount {discountType === 'PERCENTAGE' ? `(${defaultDiscount}%)` : ''}
                                        </span>
                                        <span>-₹{preview.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Step 3: Taxable Amount (after discount) */}
                                {enableDiscount && preview.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-2">
                                        <span className="text-gray-700">Taxable Amount</span>
                                        <span>₹{preview.taxableAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Step 4: GST Breakdown (on taxable amount) */}
                                {parseFloat(taxRate) > 0 && (
                                    <>
                                        {showBreakdown && taxName.toLowerCase().includes('gst') ? (
                                            <>
                                                <div className="flex justify-between text-sm text-green-700">
                                                    <span>CGST ({preview.cgstRate.toFixed(2)}%)</span>
                                                    <span>₹{preview.cgst.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-green-700">
                                                    <span>SGST ({preview.sgstRate.toFixed(2)}%)</span>
                                                    <span>₹{preview.sgst.toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex justify-between text-sm text-green-700">
                                                <span>{taxName} ({taxRate}%)</span>
                                                <span>₹{preview.totalGst.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Step 5: Total */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-900">Grand Total</span>
                                    <span className="font-bold text-xl text-orange-600">₹{preview.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-200"
                >
                    {saving ? "Saving..." : (
                        <>
                            <Save className="h-4 w-4 mr-2" /> Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
