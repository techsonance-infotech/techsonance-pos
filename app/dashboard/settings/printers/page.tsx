"use client"

import { useState, useEffect } from "react"
import { Home, ArrowLeft, Printer, Save, TestTube, Check, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getPrinterSettings, updatePrinterSettings, testPrint } from "@/app/actions/printer"
import PrintersLoading from "./loading"

export default function PrinterSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [detectingPrinters, setDetectingPrinters] = useState(false)
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([])

    // Printer Configuration
    const [printerName, setPrinterName] = useState("")
    const [printerType, setPrinterType] = useState("thermal_80mm")
    const [paperWidth, setPaperWidth] = useState("80")
    const [autoPrint, setAutoPrint] = useState(false)
    const [printCopies, setPrintCopies] = useState("1")
    const [connectionType, setConnectionType] = useState("usb")

    // Receipt Formatting
    const [fontSize, setFontSize] = useState("medium")
    const [printQuality, setPrintQuality] = useState("normal")
    const [cutType, setCutType] = useState("full")
    const [enableBuzzer, setEnableBuzzer] = useState(true)

    // Advanced Settings
    const [characterEncoding, setCharacterEncoding] = useState("UTF-8")
    const [lineSpacing, setLineSpacing] = useState("1")
    const [topMargin, setTopMargin] = useState("0")
    const [bottomMargin, setBottomMargin] = useState("0")
    const [enableQrCode, setEnableQrCode] = useState(false)
    const [footerText, setFooterText] = useState("")

    useEffect(() => {
        loadSettings()
        detectPrinters()
    }, [])

    const detectPrinters = async () => {
        setDetectingPrinters(true)
        try {
            // Common thermal printer models as fallback
            const commonPrinters = [
                "Default Printer",
                "Epson TM-T82",
                "Epson TM-T88V",
                "Star TSP143",
                "Bixolon SRP-350",
                "Citizen CT-S310II"
            ]

            setAvailablePrinters(commonPrinters)
            toast.info("Showing common printer models")
        } catch (error) {
            console.error("Error detecting printers:", error)
            setAvailablePrinters(["Default Printer"])
        } finally {
            setDetectingPrinters(false)
        }
    }

    const loadSettings = async () => {
        setLoading(true)
        try {
            const settings = await getPrinterSettings()
            if (settings) {
                setPrinterName(settings.printerName || "")
                setPrinterType(settings.printerType || "thermal_80mm")
                setPaperWidth(settings.paperWidth?.toString() || "80")
                setAutoPrint(settings.autoPrint || false)
                setPrintCopies(settings.printCopies?.toString() || "1")
                setConnectionType(settings.connectionType || "usb")
                setFontSize(settings.fontSize || "medium")
                setPrintQuality(settings.printQuality || "normal")
                setCutType(settings.cutType || "full")
                setEnableBuzzer(settings.enableBuzzer ?? true)
                setCharacterEncoding(settings.characterEncoding || "UTF-8")
                setLineSpacing(settings.lineSpacing?.toString() || "1")
                setTopMargin(settings.topMargin?.toString() || "0")
                setBottomMargin(settings.bottomMargin?.toString() || "0")
                setEnableQrCode(settings.enableQrCode || false)
                setFooterText(settings.footerText || "")
            }
        } catch (error) {
            toast.error("Failed to load printer settings")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await updatePrinterSettings({
                printerName,
                printerType,
                paperWidth: parseInt(paperWidth),
                autoPrint,
                printCopies: parseInt(printCopies),
                connectionType,
                fontSize,
                printQuality,
                cutType,
                enableBuzzer,
                characterEncoding,
                lineSpacing: parseInt(lineSpacing),
                topMargin: parseInt(topMargin),
                bottomMargin: parseInt(bottomMargin),
                enableQrCode,
                footerText
            })

            if (result.success) {
                toast.success("Printer settings saved successfully!")
            } else {
                toast.error(result.error || "Failed to save settings")
            }
        } catch (error) {
            toast.error("An error occurred while saving")
        } finally {
            setSaving(false)
        }
    }

    const handleTestPrint = async () => {
        setTesting(true)
        try {
            const result = await testPrint()
            if (result.success) {
                toast.success("Test print sent successfully!")
            } else {
                toast.error(result.error || "Failed to send test print")
            }
        } catch (error) {
            toast.error("An error occurred during test print")
        } finally {
            setTesting(false)
        }
    }

    if (loading) return <PrintersLoading />

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-green-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-green-600 transition-colors">More Options</Link>
                <span>/</span>
                <span className="font-medium text-green-600">Printer Settings</span>
            </div>

            {/* Header */}
            <div>
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Printer Settings</h1>
                <p className="text-gray-500 mt-2 text-lg">Configure thermal printer and receipt formatting</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Printer Configuration */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <Printer className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Printer Configuration</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Select Printer</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={detectPrinters}
                                        disabled={detectingPrinters}
                                        className="h-7 text-xs"
                                    >
                                        <RefreshCw className={`h-3 w-3 mr-1 ${detectingPrinters ? 'animate-spin' : ''}`} />
                                        {detectingPrinters ? 'Scanning...' : 'Refresh'}
                                    </Button>
                                </div>
                                <Select value={printerName} onValueChange={setPrinterName}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a printer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availablePrinters.map((printer: any) => (
                                            <SelectItem key={printer} value={printer}>
                                                {printer}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Printer Type</Label>
                                <Select value={printerType} onValueChange={setPrinterType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="thermal_58mm">Thermal 58mm</SelectItem>
                                        <SelectItem value="thermal_80mm">Thermal 80mm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Paper Width</Label>
                                <Select value={paperWidth} onValueChange={setPaperWidth}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="58">58mm</SelectItem>
                                        <SelectItem value="80">80mm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Connection Type</Label>
                                <Select value={connectionType} onValueChange={setConnectionType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="usb">USB</SelectItem>
                                        <SelectItem value="network">Network</SelectItem>
                                        <SelectItem value="bluetooth">Bluetooth</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Print Copies</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={printCopies}
                                    onChange={(e) => setPrintCopies(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-6">
                                <Label htmlFor="auto-print" className="cursor-pointer">Auto-print on order</Label>
                                <Switch
                                    id="auto-print"
                                    checked={autoPrint}
                                    onCheckedChange={setAutoPrint}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Receipt Formatting */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Receipt Formatting</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Font Size</Label>
                                <Select value={fontSize} onValueChange={setFontSize}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Small</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="large">Large</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Print Quality</Label>
                                <Select value={printQuality} onValueChange={setPrintQuality}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cut Type</Label>
                                <Select value={cutType} onValueChange={setCutType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full">Full Cut</SelectItem>
                                        <SelectItem value="partial">Partial Cut</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between pt-6">
                                <Label htmlFor="buzzer" className="cursor-pointer">Enable Buzzer</Label>
                                <Switch
                                    id="buzzer"
                                    checked={enableBuzzer}
                                    onCheckedChange={setEnableBuzzer}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Advanced Settings</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Character Encoding</Label>
                                <Select value={characterEncoding} onValueChange={setCharacterEncoding}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UTF-8">UTF-8</SelectItem>
                                        <SelectItem value="ASCII">ASCII</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Line Spacing</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={lineSpacing}
                                    onChange={(e) => setLineSpacing(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Top Margin (mm)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={topMargin}
                                    onChange={(e) => setTopMargin(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Bottom Margin (mm)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={bottomMargin}
                                    onChange={(e) => setBottomMargin(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Label htmlFor="qr-code" className="cursor-pointer">Enable QR Code</Label>
                                <Switch
                                    id="qr-code"
                                    checked={enableQrCode}
                                    onCheckedChange={setEnableQrCode}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label>Footer Text</Label>
                                <Textarea
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    placeholder="Thank you for your business!"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Panel */}
                <div className="space-y-6">
                    <div className="bg-green-50 rounded-2xl border border-green-100 p-8">
                        <h3 className="text-green-900 font-bold mb-6">Printer Status</h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Printer</p>
                                    <p className="text-sm text-green-700">{printerName || 'Not configured'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Type</p>
                                    <p className="text-sm text-green-700">{printerType.replace('_', ' ').toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Paper Width</p>
                                    <p className="text-sm text-green-700">{paperWidth}mm</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${autoPrint ? 'bg-green-600' : 'bg-gray-400'}`} />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Auto-print</p>
                                    <p className="text-sm text-green-700">{autoPrint ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleTestPrint}
                            disabled={testing}
                            className="w-full mt-6 bg-green-600 hover:bg-green-700 h-12"
                        >
                            <TestTube className="h-4 w-4 mr-2" />
                            {testing ? 'Printing...' : 'Test Print'}
                        </Button>
                    </div>

                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
                        <h4 className="text-blue-900 font-bold mb-3 text-sm">Quick Tips</h4>
                        <ul className="space-y-2 text-xs text-blue-800">
                            <li className="flex gap-2">
                                <Check className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>58mm printers: ~32 characters per line</span>
                            </li>
                            <li className="flex gap-2">
                                <Check className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>80mm printers: ~48 characters per line</span>
                            </li>
                            <li className="flex gap-2">
                                <Check className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>Test print before enabling auto-print</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
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
