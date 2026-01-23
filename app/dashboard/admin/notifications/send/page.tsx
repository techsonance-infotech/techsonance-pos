"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Home, ArrowLeft, Send, AlertTriangle, Info, Bell, Building2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getCompanies } from "@/app/actions/company"
import { broadcastNotification } from "@/app/actions/notifications"

export default function SendNotificationPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [companies, setCompanies] = useState<any[]>([])
    const [loadingCompanies, setLoadingCompanies] = useState(true)

    // Form State
    const [formData, setFormData] = useState({
        companyId: '',
        title: '',
        message: '',
        type: 'SYSTEM'
    })

    useEffect(() => {
        loadCompanies()
    }, [])

    const loadCompanies = async () => {
        try {
            const result = await getCompanies()
            if (result.success && result.companies) {
                setCompanies(result.companies)
            } else {
                toast.error("Failed to load companies")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error loading companies")
        } finally {
            setLoadingCompanies(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.companyId || !formData.title || !formData.message) {
            toast.error("Please fill in all fields")
            return
        }

        setLoading(true)
        try {
            const result = await broadcastNotification(
                formData.companyId,
                formData.title,
                formData.message,
                formData.type as any
            )

            if (result.success) {
                toast.success(`Notification sent to ${result.count} users successfully!`)
                router.push('/dashboard/settings')
            } else {
                toast.error(result.error || "Failed to send notification")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    const getPreviewIcon = () => {
        switch (formData.type) {
            case 'ALERT': return <AlertTriangle className="h-5 w-5 text-red-500" />
            case 'PROMO': return <Bell className="h-5 w-5 text-purple-500" />
            default: return <Info className="h-5 w-5 text-blue-500" />
        }
    }

    const getPreviewBg = () => {
        switch (formData.type) {
            case 'ALERT': return "bg-red-50 border-red-100"
            case 'PROMO': return "bg-purple-50 border-purple-100"
            default: return "bg-blue-50 border-blue-100"
        }
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">Settings</Link>
                <span>/</span>
                <span className="font-medium text-orange-600">Send Notifications</span>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
                    <p className="text-gray-500 mt-1">Broadcast messages to company admins and managers</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Target Company</Label>
                                <Select
                                    value={formData.companyId}
                                    onValueChange={(val) => setFormData({ ...formData, companyId: val })}
                                    disabled={loadingCompanies}
                                >
                                    <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                        <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map(company => (
                                            <SelectItem key={company.id} value={company.id}>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-gray-400" />
                                                    <span>{company.name}</span>
                                                    <span className="text-xs text-gray-400 ml-2">({company.slug})</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Notification Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val) => setFormData({ ...formData, type: val })}
                                    >
                                        <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SYSTEM">
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-blue-500" />
                                                    <span>System Message</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="ALERT">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    <span>Important Alert</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="PROMO">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="h-4 w-4 text-purple-500" />
                                                    <span>Promotion / Offer</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        placeholder="e.g. System Maintenance"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="h-12 bg-gray-50 border-gray-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Message Content</Label>
                                <Textarea
                                    placeholder="Type your message here..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="min-h-[150px] bg-gray-50 border-gray-200 resize-none p-4"
                                    required
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading || !formData.companyId}
                                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:shadow-orange-300"
                                >
                                    {loading ? "Sending..." : (
                                        <span className="flex items-center gap-2">
                                            <Send className="h-5 w-5" /> Send Notification
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Preview
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">This is how the notification will appear to the recipients.</p>

                        <div className={`p-4 rounded-xl border ${getPreviewBg()} transition-colors`}>
                            <div className="flex gap-4">
                                <div className="shrink-0 mt-1">
                                    {getPreviewIcon()}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-gray-900">{formData.title || "Notification Title"}</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {formData.type === 'ALERT' ? '⚠️ ' : formData.type === 'PROMO' ? '🎉 ' : '📢 '}
                                        {formData.message || "Message content will appear here..."}
                                    </p>
                                    <p className="text-xs text-gray-400 pt-2">Just now</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <h4 className="font-bold text-sm text-gray-900 mb-2">Target Audience</h4>
                            <p className="text-sm text-gray-500">
                                This message will be sent to all <strong>Business Owners</strong> and <strong>Managers</strong> of the selected company.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
