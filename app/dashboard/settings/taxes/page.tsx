"use client"

import { useState } from "react"
import { Home, ArrowLeft, Receipt, Save, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function TaxConfigurationPage() {
    const [taxRate, setTaxRate] = useState("5")
    const [showBreakdown, setShowBreakdown] = useState(true)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setSaving(false)
        toast.success("Tax settings saved successfully")
    }

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
                <p className="text-gray-500 mt-2 text-lg">Manage your settings and preferences</p>
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
                            <p className="text-sm font-medium leading-relaxed">Current tax rate: <span className="font-bold">{taxRate}%</span></p>
                        </div>
                        <div className="flex gap-3 text-blue-800">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">Tax is applied to all orders automatically at checkout.</p>
                        </div>
                        <div className="flex gap-3 text-blue-800">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-sm font-medium leading-relaxed">Changes usually take effect immediately for new orders.</p>
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
