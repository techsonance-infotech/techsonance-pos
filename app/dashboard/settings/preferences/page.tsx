"use client"

import { useState } from "react"
import { Home, ArrowLeft, Settings, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function AppPreferencesPage() {
    const [theme, setTheme] = useState("light")
    const [currency, setCurrency] = useState("INR")
    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY")
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setSaving(false)
        toast.success("Preferences saved successfully")
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
                <span className="font-medium text-orange-600">App Preferences</span>
            </div>

            {/* Back Link */}
            <div>
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">App Preferences</h1>
                <p className="text-gray-500 mt-2 text-lg">Manage your settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left: Settings Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Settings className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Application Settings</h2>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Theme</Label>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System Default</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                                    <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                                    <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">Date Format</Label>
                            <Select value={dateFormat} onValueChange={setDateFormat}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select date format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Right: Info Panel */}
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-8 space-y-6 h-full min-h-[300px]">
                    <h3 className="text-amber-900 font-bold mb-6 text-lg">Current Settings</h3>

                    <div className="space-y-5">
                        <div className="flex gap-2 text-amber-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            <p className="text-sm font-medium">Theme: <span className="font-bold capitalize">{theme}</span></p>
                        </div>
                        <div className="flex gap-2 text-amber-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            <p className="text-sm font-medium">Currency: <span className="font-bold">{currency === 'INR' ? '₹ INR (Indian Rupee)' : currency}</span></p>
                        </div>
                        <div className="flex gap-2 text-amber-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            <p className="text-sm font-medium">Date Format: <span className="font-bold">{dateFormat}</span></p>
                        </div>
                        <div className="flex gap-2 text-amber-800 items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            <p className="text-sm font-medium">Language: <span className="font-bold">English</span></p>
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
