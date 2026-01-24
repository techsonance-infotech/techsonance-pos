'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft, User, Building2, Clock, Tag, AlertCircle, MessageSquare,
    Send, Check, X, RefreshCw, UserPlus, Paperclip
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getTicketDetails, addTicketMessage, updateTicketStatus, assignTicket } from "@/app/actions/support"

// Status colors
const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    WAITING_FOR_CUSTOMER: "bg-purple-100 text-purple-700",
    RESOLVED: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-100 text-gray-600"
}

const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500 text-white",
    HIGH: "bg-orange-500 text-white",
    MEDIUM: "bg-yellow-400 text-gray-900",
    LOW: "bg-gray-200 text-gray-700"
}

export default function TicketDetailPage({ params }: { params: { ticketId: string } }) {
    const router = useRouter()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [ticket, setTicket] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [isInternal, setIsInternal] = useState(false)
    const [sending, setSending] = useState(false)

    const loadTicket = async () => {
        setLoading(true)
        const data = await getTicketDetails(params.ticketId)
        if (data) setTicket(data)
        setLoading(false)
    }

    useEffect(() => { loadTicket() }, [params.ticketId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [ticket?.messages])

    const handleSend = async () => {
        if (!message.trim()) return
        setSending(true)
        await addTicketMessage(ticket.id, message, { isInternal })
        setMessage('')
        setIsInternal(false)
        await loadTicket()
        setSending(false)
    }

    const handleStatusChange = async (status: string) => {
        await updateTicketStatus(ticket.id, status as any)
        await loadTicket()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="p-6">
                <p className="text-red-500">Ticket not found or access denied.</p>
                <Link href="/dashboard/admin/support" className="text-blue-600 hover:underline">
                    ← Back to list
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
                <Link href="/dashboard/admin/support" className="text-gray-400 hover:text-gray-600 transition">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[ticket.status])}>
                            {ticket.status.replace(/_/g, ' ')}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", priorityColors[ticket.priority])}>
                            {ticket.priority}
                        </span>
                    </div>
                    <h1 className="text-lg font-bold text-gray-900 truncate">{ticket.subject}</h1>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Conversation */}
                <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {ticket.messages.map((msg: any, idx: number) => {
                            const isSuperAdmin = msg.sender?.role === 'SUPER_ADMIN'
                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "max-w-[80%] rounded-xl p-4 shadow-sm",
                                        isSuperAdmin
                                            ? "ml-auto bg-orange-50 border border-orange-100"
                                            : "mr-auto bg-white border border-gray-100",
                                        msg.isInternal && "bg-yellow-50 border-yellow-200"
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <User className="h-3 w-3" />
                                        <span className="font-medium">{msg.sender?.username || 'Unknown'}</span>
                                        {msg.isInternal && (
                                            <span className="text-yellow-600 text-[10px] font-semibold uppercase">Internal</span>
                                        )}
                                        <span className="ml-auto">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Box */}
                    <div className="bg-white border-t p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-1 text-xs text-gray-500">
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                    className="rounded"
                                />
                                Internal Note
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                rows={2}
                            />
                            <button
                                onClick={handleSend}
                                disabled={sending || !message.trim()}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-72 bg-white border-l p-4 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>

                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Company</p>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{ticket.company?.name || 'N/A'}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Store</p>
                            <span className="font-medium">{ticket.store?.name || 'N/A'}</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Created By</p>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{ticket.createdBy?.username}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Category</p>
                            <span className="font-medium">{ticket.category}</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Created</p>
                            <span className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                        {ticket.dueAt && (
                            <div>
                                <p className="text-gray-400 text-xs mb-1">SLA Due</p>
                                <span className="font-medium text-orange-600">{new Date(ticket.dueAt).toLocaleString()}</span>
                            </div>
                        )}
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Assigned To</p>
                            <span className="font-medium">{ticket.assignedTo?.username || 'Unassigned'}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-4">Actions</h3>
                    <div className="space-y-2">
                        {ticket.status !== 'IN_PROGRESS' && (
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                className="w-full px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
                            >
                                Mark In Progress
                            </button>
                        )}
                        {ticket.status !== 'WAITING_FOR_CUSTOMER' && (
                            <button
                                onClick={() => handleStatusChange('WAITING_FOR_CUSTOMER')}
                                className="w-full px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                            >
                                Waiting for Customer
                            </button>
                        )}
                        {ticket.status !== 'RESOLVED' && (
                            <button
                                onClick={() => handleStatusChange('RESOLVED')}
                                className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                            >
                                <Check className="h-4 w-4 inline mr-1" />
                                Resolve
                            </button>
                        )}
                        {ticket.status !== 'CLOSED' && (
                            <button
                                onClick={() => handleStatusChange('CLOSED')}
                                className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <X className="h-4 w-4 inline mr-1" />
                                Close
                            </button>
                        )}
                    </div>

                    {/* Activity Log */}
                    {ticket.logs && ticket.logs.length > 0 && (
                        <>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-4">Activity</h3>
                            <div className="space-y-2 text-xs">
                                {ticket.logs.slice(0, 5).map((log: any) => (
                                    <div key={log.id} className="text-gray-500">
                                        <span className="font-medium text-gray-700">{log.action}</span>
                                        <span className="block text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
