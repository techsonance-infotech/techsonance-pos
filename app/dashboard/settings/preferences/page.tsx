"use client"

import { useState, useEffect } from "react"
import { Home, ArrowLeft, Palette, DollarSign, Calendar, Save, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getAppPreferences, updateAppPreferences } from "@/app/actions/preferences"
import { CURRENCIES, DATE_FORMATS } from "@/lib/currencies"
import { formatCurrency, formatDate } from "@/lib/format"
import PreferencesLoading from "./loading"

export default function AppPreferencesPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [theme, setTheme] = useState("light")
    const [currencyCode, setCurrencyCode] = useState("USD")
    const [dateFormat, setDateFormat] = useState("MM/DD/YYYY")

    useEffect(() => {
        loadPreferences()
    }, [])

    const loadPreferences = async () => {
        setLoading(true)
        try {
            const prefs = await getAppPreferences()
            setTheme(prefs.theme)
            setCurrencyCode(prefs.currencyCode)
            setDateFormat(prefs.dateFormat)
        } catch (error) {
            // Offline fallback - try to load from local cache
            console.warn("Preferences: Server fetch failed, using local settings", error)
            try {
                const { getPOSService } = await import("@/lib/pos-service")
                const posService = getPOSService()
                const localSettings = await posService.getSettings()
                const getSetting = (key: string, defaultVal: string) =>
                    localSettings.find(s => s.key === key)?.value ?? defaultVal

                setTheme(getSetting('pref_theme', 'light'))
                setCurrencyCode(getSetting('pref_currencyCode', 'INR'))
                setDateFormat(getSetting('pref_dateFormat', 'DD/MM/YYYY'))
            } catch (innerError) {
                console.error("Failed to load local preferences", innerError)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await updateAppPreferences({
                theme,
                currencyCode,
                dateFormat
            })

            if (result.success) {
                toast.success("Preferences saved successfully!")
                // Reload the page to apply theme changes
                setTimeout(() => window.location.reload(), 500)
            } else {
                toast.error(result.error || "Failed to save preferences")
            }
        } catch (error) {
            toast.error("An error occurred while saving")
        } finally {
            setSaving(false)
        }
    }

    const selectedCurrency = CURRENCIES.find((c: any) => c.code === currencyCode) || CURRENCIES[0]
    const selectedDateFormat = DATE_FORMATS.find((f: any) => f.value === dateFormat) || DATE_FORMATS[0]

    if (loading) return <PreferencesLoading />

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-blue-600 transition-colors">More Options</Link>
                <span>/</span>
                <span className="font-medium text-blue-600">App Preferences</span>
            </div>

            {/* Header */}
            <div>
                <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">App Preferences</h1>
                <p className="text-gray-500 mt-2 text-lg">Customize your application experience</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Theme Settings */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Palette className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Theme</h2>
                                <p className="text-sm text-gray-500">Choose your preferred theme</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setTheme('light')}
                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'light'
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Sun className={`h-8 w-8 mx-auto mb-3 ${theme === 'light' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <p className={`font-semibold ${theme === 'light' ? 'text-blue-600' : 'text-gray-700'}`}>
                                    Light Mode
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Bright and clean</p>
                            </button>

                            <button
                                onClick={() => setTheme('dark')}
                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark'
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Moon className={`h-8 w-8 mx-auto mb-3 ${theme === 'dark' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <p className={`font-semibold ${theme === 'dark' ? 'text-blue-600' : 'text-gray-700'}`}>
                                    Dark Mode
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Easy on the eyes</p>
                            </button>
                        </div>
                    </div>

                    {/* Currency Settings */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Currency</h2>
                                <p className="text-sm text-gray-500">Set your default currency</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Currency</Label>
                                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {CURRENCIES.map((currency: any) => (
                                            <SelectItem key={currency.code} value={currency.code}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{currency.symbol}</span>
                                                    <span>{currency.code}</span>
                                                    <span className="text-gray-500">- {currency.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(1234.56, selectedCurrency.symbol)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date Format Settings */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Date Format</h2>
                                <p className="text-sm text-gray-500">Choose how dates are displayed</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Format</Label>
                                <Select value={dateFormat} onValueChange={setDateFormat}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DATE_FORMATS.map((format: any) => (
                                            <SelectItem key={format.value} value={format.value}>
                                                {format.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatDate(new Date(), dateFormat)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="space-y-6">
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-8">
                        <h3 className="text-blue-900 font-bold mb-6">Current Settings</h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Theme</p>
                                    <p className="text-sm text-blue-700 capitalize">{theme} Mode</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Currency</p>
                                    <p className="text-sm text-blue-700">
                                        {selectedCurrency.symbol} {selectedCurrency.code}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Date Format</p>
                                    <p className="text-sm text-blue-700">{selectedDateFormat.example}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                        <h4 className="text-amber-900 font-bold mb-3 text-sm">Important Note</h4>
                        <p className="text-xs text-amber-800">
                            Changes will apply across the entire application. The page will reload to apply theme changes.
                        </p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
                >
                    {saving ? "Saving..." : (
                        <>
                            <Save className="h-4 w-4 mr-2" /> Save Preferences
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
