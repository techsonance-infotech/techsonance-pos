'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createTicket } from "@/app/actions/support"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Send, Home, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function CreateTicketPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        priority: "MEDIUM",
        description: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.category || !formData.description) {
            toast.error("Please fill in all required fields")
            return
        }

        setLoading(true)
        try {
            await createTicket({
                ...formData,
                systemInfo: JSON.stringify({
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                })
            })
            toast.success("Ticket raised successfully!")
            router.push("/dashboard/support/tickets")
        } catch (error) {
            toast.error("Failed to create ticket")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit mb-4">
                        <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                            <Home className="h-4 w-4" />
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link href="/dashboard/support" className="hover:text-orange-600 transition-colors">
                            Help & Support
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="font-medium text-orange-600">Raise Ticket</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Raise a Ticket</h1>
                    <p className="text-gray-500">Describe your issue and we'll help you resolve it.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Issue Title <span className="text-red-500">*</span></label>
                        <Input
                            placeholder="Brief summary of the issue..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Billing">Billing & Invoices</SelectItem>
                                    <SelectItem value="Technical">Technical Issue</SelectItem>
                                    <SelectItem value="Inventory">Inventory Management</SelectItem>
                                    <SelectItem value="Reports">Reports & Analytics</SelectItem>
                                    <SelectItem value="Feature">Feature Request</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Priority</label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val) => setFormData({ ...formData, priority: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low - General Question</SelectItem>
                                    <SelectItem value="MEDIUM">Medium - Performance Issue</SelectItem>
                                    <SelectItem value="HIGH">High - Critical Bug</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                        <Textarea
                            placeholder="Please provide detailed steps to reproduce the issue..."
                            className="min-h-[150px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <Send className="h-4 w-4 mr-2" /> Submit Ticket
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
