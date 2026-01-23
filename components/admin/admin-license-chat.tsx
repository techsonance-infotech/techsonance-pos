"use client"

import { useState, useEffect, useRef } from "react"
import {
    sendLicenseRequestMessage,
    updateLicenseRequestStatus,
    verifyPaymentAndSendKey,
    getLicenseRequestById
} from "@/app/actions/license-request"
import { getPaymentDetailsMessage } from "@/app/actions/payment-config"
import { generateWindowsStyleKey } from "@/lib/licensing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Send,
    CheckCircle,
    XCircle,
    User,
    Shield,
    Loader2,
    CreditCard,
    Key,
    Copy,
    Image
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
    companyId: string
    planType: string
    planPrice: number
    status: string
    licenseKey: string | null
    paymentScreenshot: string | null
    messages: Message[]
    company: { id: string, name: string, slug: string }
    requestedBy: { id: string, username: string, email: string }
}

const STATUS_LABELS: Record<string, { label: string, color: string }> = {
    PENDING: { label: 'New Request', color: 'bg-yellow-100 text-yellow-700' },
    PAYMENT_PENDING: { label: 'Payment Details Sent', color: 'bg-blue-100 text-blue-700' },
    PAYMENT_UPLOADED: { label: 'Payment Screenshot Uploaded', color: 'bg-purple-100 text-purple-700' },
    VERIFIED: { label: 'Payment Verified', color: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
}

export function AdminLicenseChat({ request: initialRequest }: { request: LicenseRequest }) {
    const router = useRouter()
    const [request, setRequest] = useState(initialRequest)
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [generatingKey, setGeneratingKey] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [request.messages])

    // Poll for updates
    useEffect(() => {
        const interval = setInterval(async () => {
            const updated = await getLicenseRequestById(request.id)
            if (!('error' in updated)) {
                setRequest(updated as any)
            }
        }, 10000)
        return () => clearInterval(interval)
    }, [request.id])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return

        setSending(true)
        const result = await sendLicenseRequestMessage(request.id, message.trim())

        if (result.error) {
            toast.error(result.error)
        } else {
            setMessage("")
            const updated = await getLicenseRequestById(request.id)
            if (!('error' in updated)) {
                setRequest(updated as any)
            }
        }
        setSending(false)
    }

    const handleSendPaymentDetails = async () => {
        setSending(true)

        // Fetch configured payment details
        const paymentMessage = await getPaymentDetailsMessage(request.planPrice)

        const result = await sendLicenseRequestMessage(request.id, paymentMessage)
        if (!result.error) {
            await updateLicenseRequestStatus(request.id, 'PAYMENT_PENDING')
            const updated = await getLicenseRequestById(request.id)
            if (!('error' in updated)) {
                setRequest(updated as any)
            }
            toast.success("Payment details sent!")
        }
        setSending(false)
    }

    const handleVerifyAndSendKey = async () => {
        setGeneratingKey(true)

        // Generate a new license key
        const key = `${randomSegment()}-${randomSegment()}-${randomSegment()}`

        const result = await verifyPaymentAndSendKey(request.id, key)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Payment verified and license key sent!")
            const updated = await getLicenseRequestById(request.id)
            if (!('error' in updated)) {
                setRequest(updated as any)
            }
        }
        setGeneratingKey(false)
    }

    const handleReject = async () => {
        if (!confirm("Are you sure you want to reject this request?")) return

        await updateLicenseRequestStatus(request.id, 'REJECTED', "Your license request has been rejected. Please contact support for more information.")
        router.push('/dashboard/admin/license-requests')
    }

    const status = STATUS_LABELS[request.status] || STATUS_LABELS.PENDING

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat */}
            <div className="lg:col-span-2 flex flex-col h-[calc(100vh-280px)] bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">{request.company.name}</h2>
                            <p className="text-sm text-gray-500">{request.requestedBy.email}</p>
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
                                msg.isAdminMessage ? "justify-end" : "justify-start"
                            )}
                        >
                            {!msg.isAdminMessage && (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-gray-500" />
                                </div>
                            )}
                            <div className={cn(
                                "max-w-[70%] rounded-2xl p-3",
                                msg.isAdminMessage
                                    ? "bg-orange-500 text-white"
                                    : "bg-white border border-gray-200 shadow-sm"
                            )}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.attachmentUrl && (
                                    <img
                                        src={msg.attachmentUrl}
                                        alt="Attachment"
                                        className="mt-2 rounded-lg max-w-full h-auto cursor-pointer"
                                        onClick={() => window.open(msg.attachmentUrl!, '_blank')}
                                    />
                                )}
                                <p className={cn(
                                    "text-xs mt-1",
                                    msg.isAdminMessage ? "text-orange-200" : "text-gray-400"
                                )}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            {msg.isAdminMessage && (
                                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                    <Shield className="h-4 w-4 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {request.status !== 'COMPLETED' && request.status !== 'REJECTED' && (
                    <div className="p-4 border-t border-gray-100 bg-white space-y-2">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                placeholder="Type a message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={sending}
                            />
                            <Button type="submit" disabled={sending || !message.trim()}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                        {/* Quick action buttons */}
                        {(request.status === 'PENDING' || request.status === 'PAYMENT_PENDING') && (
                            <Button
                                onClick={handleSendPaymentDetails}
                                disabled={sending}
                                variant="outline"
                                size="sm"
                                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Send Payment Details
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Panel */}
            <div className="space-y-4">
                {/* Request Info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Request Details</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Plan</dt>
                            <dd className="font-medium">{request.planType}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Amount</dt>
                            <dd className="font-medium text-green-600">₹{request.planPrice.toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Company ID</dt>
                            <dd className="font-mono text-xs">{request.companyId.slice(0, 8)}...</dd>
                        </div>
                    </dl>
                </div>

                {/* Payment Screenshot */}
                {request.paymentScreenshot && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Payment Screenshot
                        </h3>
                        <img
                            src={request.paymentScreenshot}
                            alt="Payment Screenshot"
                            className="rounded-lg w-full cursor-pointer"
                            onClick={() => window.open(request.paymentScreenshot!, '_blank')}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>

                    {request.status === 'PENDING' && (
                        <Button
                            onClick={handleSendPaymentDetails}
                            disabled={sending}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Send Payment Details
                        </Button>
                    )}

                    {request.status === 'PAYMENT_UPLOADED' && (
                        <Button
                            onClick={handleVerifyAndSendKey}
                            disabled={generatingKey}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {generatingKey ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Key className="h-4 w-4 mr-2" />
                            )}
                            Verify & Send License Key
                        </Button>
                    )}

                    {request.status !== 'COMPLETED' && request.status !== 'REJECTED' && (
                        <Button
                            onClick={handleReject}
                            variant="outline"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Request
                        </Button>
                    )}

                    {request.licenseKey && (
                        <div className="pt-3 border-t">
                            <p className="text-sm text-gray-500 mb-2">License Key Sent:</p>
                            <code className="block bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-center">
                                {request.licenseKey}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function randomSegment(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 5; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
}
