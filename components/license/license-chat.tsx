"use client"

import { useState, useEffect, useRef } from "react"
import {
    sendLicenseRequestMessage,
    uploadPaymentScreenshot,
    getMyLicenseRequest
} from "@/app/actions/license-request"
import { activateLicense } from "@/app/actions/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Send,
    Upload,
    Key,
    CheckCircle,
    Clock,
    User,
    Shield,
    Loader2,
    MessageSquare,
    Copy
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Message = {
    id: string
    content: string
    attachmentUrl: string | null
    isAdminMessage: boolean
    createdAt: Date
    sender: {
        id: string
        username: string
        role: string
    }
}

type LicenseRequest = {
    id: string
    planType: string
    planPrice: number
    status: string
    licenseKey: string | null
    paymentScreenshot: string | null
    messages: Message[]
    company: { name: string }
}

const STATUS_LABELS: Record<string, { label: string, color: string }> = {
    PENDING: { label: 'Waiting for Admin', color: 'bg-yellow-100 text-yellow-700' },
    PAYMENT_PENDING: { label: 'Payment Details Sent', color: 'bg-blue-100 text-blue-700' },
    PAYMENT_UPLOADED: { label: 'Verifying Payment', color: 'bg-purple-100 text-purple-700' },
    VERIFIED: { label: 'Payment Verified', color: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
}

export function LicenseChat({ initialRequest }: { initialRequest: LicenseRequest | null }) {
    const [request, setRequest] = useState(initialRequest)
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [licenseKey, setLicenseKey] = useState("")
    const [activating, setActivating] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [request?.messages])

    // Poll for updates every 10 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            const updated = await getMyLicenseRequest()
            if (updated) {
                setRequest(updated as any)
            }
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || !request) return

        setSending(true)
        const result = await sendLicenseRequestMessage(request.id, message.trim())

        if (result.error) {
            toast.error(result.error)
        } else {
            setMessage("")
            // Refresh messages
            const updated = await getMyLicenseRequest()
            if (updated) {
                setRequest(updated as any)
            }
        }
        setSending(false)
    }

    const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !request) return

        const file = e.target.files[0]
        // In a real app, upload to cloud storage and get URL
        // For now, convert to base64
        const reader = new FileReader()
        reader.onload = async () => {
            const base64 = reader.result as string
            const result = await uploadPaymentScreenshot(request.id, base64)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Payment screenshot uploaded!")
                const updated = await getMyLicenseRequest()
                if (updated) {
                    setRequest(updated as any)
                }
            }
        }
        reader.readAsDataURL(file)
    }

    const handleActivateLicense = async () => {
        if (!licenseKey.trim()) {
            toast.error("Please enter a license key")
            return
        }

        setActivating(true)
        const result = await activateLicense(licenseKey.trim().toUpperCase())

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("License activated successfully!")
            window.location.href = '/dashboard'
        }
        setActivating(false)
    }

    const copyLicenseKey = () => {
        if (request?.licenseKey) {
            navigator.clipboard.writeText(request.licenseKey)
            toast.success("License key copied!")
        }
    }

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">No Active License Request</h3>
                <p className="text-gray-500 mt-2">Start by selecting a pricing plan.</p>
            </div>
        )
    }

    const status = STATUS_LABELS[request.status] || STATUS_LABELS.PENDING

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">License Request</h2>
                        <p className="text-sm text-gray-500">
                            {request.planType === 'ANNUAL' ? 'Annual' : 'Perpetual'} Plan - ₹{request.planPrice.toLocaleString()}
                        </p>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-sm font-medium", status.color)}>
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {request.messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex gap-3",
                            msg.isAdminMessage ? "justify-start" : "justify-end"
                        )}
                    >
                        {msg.isAdminMessage && (
                            <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <Shield className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <div className={cn(
                            "max-w-[70%] rounded-2xl p-3",
                            msg.isAdminMessage
                                ? "bg-white border border-gray-200 shadow-sm"
                                : "bg-orange-500 text-white"
                        )}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.attachmentUrl && (
                                <img
                                    src={msg.attachmentUrl}
                                    alt="Attachment"
                                    className="mt-2 rounded-lg max-w-full h-auto"
                                />
                            )}
                            <p className={cn(
                                "text-xs mt-1",
                                msg.isAdminMessage ? "text-gray-400" : "text-orange-200"
                            )}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {!msg.isAdminMessage && (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gray-500" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* License Key Section (if provided) */}
            {request.licenseKey && (
                <div className="p-4 bg-green-50 border-t border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Your License Key</span>
                    </div>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-center text-lg border border-green-200">
                            {request.licenseKey}
                        </code>
                        <Button variant="outline" onClick={copyLicenseKey}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <Input
                            placeholder="Enter license key to activate"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                            className="font-mono uppercase"
                        />
                        <Button
                            onClick={handleActivateLicense}
                            disabled={activating}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                            Activate
                        </Button>
                    </div>
                </div>
            )}

            {/* Input */}
            {request.status !== 'COMPLETED' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={sending}
                        />

                        {request.status === 'PAYMENT_PENDING' && (
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUploadScreenshot}
                                />
                                <Button type="button" variant="outline" asChild>
                                    <span>
                                        <Upload className="h-4 w-4" />
                                    </span>
                                </Button>
                            </label>
                        )}

                        <Button type="submit" disabled={sending || !message.trim()}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            )}
        </div>
    )
}
