"use client"

import { useState, useEffect } from "react"
import { Home, ArrowLeft, Receipt, Save, Info } from "lucide-react"
import { getBusinessSettings, updateBusinessSettings } from "@/app/actions/settings"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useCurrency } from "@/lib/hooks/use-currency"
import { formatCurrency } from "@/lib/format"
import TaxesLoading from "./loading"

export default function TaxConfigurationPage() {
    const { currency } = useCurrency()
    const [taxRate, setTaxRate] = useState("5")
    const [taxName, setTaxName] = useState("GST")
    const [showBreakdown, setShowBreakdown] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const settings = await getBusinessSettings()
            setTaxRate(settings.taxRate || "5")
            setTaxName(settings.taxName || "GST")
            setShowBreakdown(settings.showTaxBreakdown !== false) // Default to true if undefined
        } catch (error) {
            toast.error("Failed to load settings")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        const formData = new FormData()
        formData.append('taxRate', taxRate)
        formData.append('taxName', taxName)
        formData.append('showTaxBreakdown', String(showBreakdown))

        // Preserve other settings not being edited here
        // Ideally updateBusinessSettings should perform partial updates, but currently it upserts.
        // Since it's upsert by key, iterating over data and upserting individually works fine for partials in our action implementation.
        // Let's verify action implementation: It converts formdata to object and maps entries. 
        // If we only send these 3 keys, others will be undefined in the object... 
        // BUT the action does `business_name: formData.get('businessName') as string`
        // If we don't send businessName, it will be null/empty string and overwrite existing name with empty string!
        // We need to fetch existing settings first or modify action to handle partial updates.
        // Modifying action is safer long term, but let's check action code again.

        // Action: const data = { business_name: ..., tax_rate: ... }
        // It blindly reads all keys. Yes, it will look for 'businessName' in formData, get null, and save null.
        // FIX: We should fetch current settings to refill hidden fields OR improved the action.
        // Let's improve the action in a separate step or just fetch-and-fill here? 
        // Fetch-and-fill is easier for now without touching shared code heavily.

        try {
            const currentSettings = await getBusinessSettings()

            const fullFormData = new FormData()
            fullFormData.append('businessName', currentSettings.businessName)
            fullFormData.append('address', currentSettings.address)
            fullFormData.append('phone', currentSettings.phone)
            fullFormData.append('email', currentSettings.email)
            fullFormData.append('gstNo', currentSettings.gstNo)
            // New values
            fullFormData.append('taxRate', taxRate)
            fullFormData.append('taxName', taxName)
            fullFormData.append('showTaxBreakdown', String(showBreakdown))

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
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
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
                            <Label className="text-gray-700 font-medium">Tax Rate (%)</Label>
                            <Input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="h-12 text-lg"
                            />
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
                </div>

                {/* Right: Info Panel */}
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-8 space-y-6">
                    <div>
                        <h3 className="text-blue-900 font-bold mb-1">Tax Information</h3>
                        <div className="h-1 w-10 bg-blue-200 rounded-full mb-4" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-3 text-blue-800">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">Current tax rate: <span className="font-bold">{taxRate}%</span> ({taxName})</p>
                        </div>
                        <div className="flex gap-3 text-blue-800">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">Tax is applied to all orders automatically at checkout.</p>
                        </div>
                        <div className="flex gap-3 text-blue-800">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">Changes usually take effect immediately for new orders.</p>
                        </div>

                        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Preview</p>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Subtotal</span>
                                <span>₹100.00</span>
                            </div>
                            {showBreakdown && (
                                <div className="flex justify-between text-sm text-blue-600 font-medium mb-1">
                                    <span>{taxName} ({taxRate}%)</span>
                                    <span>₹{(100 * (parseFloat(taxRate) || 0) / 100).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-blue-200 pt-2 mt-2">
                                <span>Total</span>
                                <span>₹{(100 + (100 * (parseFloat(taxRate) || 0) / 100)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-blue-100 flex gap-3 text-blue-600/80 text-xs">
                        <Info className="h-4 w-4 shrink-0" />
                        <p>Consult with your accountant to ensure compliance with local tax regulations.</p>
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
