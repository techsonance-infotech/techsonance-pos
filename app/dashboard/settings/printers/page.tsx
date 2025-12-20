"use client"

import { useState } from "react"
import { Home, ArrowLeft, Printer, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function PrinterSettingsPage() {
    const [printerName, setPrinterName] = useState("Default Printer")
    const [autoPrint, setAutoPrint] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setSaving(false)
        toast.success("Printer settings saved successfully")
    }

    const handleTestPrint = async () => {
        setTesting(true)
        await new Promise(resolve => setTimeout(resolve, 1500))
        setTesting(false)
        toast.success("Test print sent successfully")
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
                <span className="font-medium text-orange-600">Printer Settings</span>
            </div>

            {/* Back Link */}
            <div>
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Printer Settings</h1>
                <p className="text-gray-500 mt-2 text-lg">Manage your settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left: Configuration Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                            <Printer className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Printer Configuration</h2>
                    </div>

                    <div className="space-y-8 max-w-md">
                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Printer Name</Label>
                            <Input
                                value={printerName}
                                onChange={(e) => setPrinterName(e.target.value)}
                                className="h-12 text-lg"
                                placeholder="e.g. Epson TM-T82"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label className="text-gray-600 cursor-pointer" htmlFor="autoprint">Auto-print on order completion</Label>
                            <Switch
                                id="autoprint"
                                checked={autoPrint}
                                onCheckedChange={setAutoPrint}
                            />
                        </div>

                        <Button
                            onClick={handleTestPrint}
                            disabled={testing}
                            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-100"
                        >
                            {testing ? "Printing..." : "Test Print"}
                        </Button>
                    </div>
                </div>

                {/* Right: Status Panel */}
                <div className="bg-green-50 rounded-2xl border border-green-100 p-8 space-y-6 h-full min-h-[300px]">
                    <h3 className="text-green-900 font-bold mb-4">Printer Status</h3>

                    <div className="space-y-4">
                        <div className="flex gap-2 text-green-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600 shrink-0" />
                            <p className="text-sm font-medium">Printer: <span className="font-bold">{printerName || 'None'}</span></p>
                        </div>
                        <div className="flex gap-2 text-green-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600 shrink-0" />
                            <p className="text-sm font-medium">Status: <span className="font-bold">Connected</span></p>
                        </div>
                        <div className="flex gap-2 text-green-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600 shrink-0" />
                            <p className="text-sm font-medium">Auto-print: <span className="font-bold">{autoPrint ? 'Enabled' : 'Disabled'}</span></p>
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
