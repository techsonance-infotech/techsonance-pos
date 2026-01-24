'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getTicketDetails, addTicketMessage } from "@/app/actions/support"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowLeft, Send, User, Shield } from "lucide-react"
import { format } from "date-fns"

export default function TicketDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const [ticket, setTicket] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [reply, setReply] = useState("")
    const [sending, setSending] = useState(false)

    useEffect(() => {
        loadTicket()
    }, [])

    async function loadTicket() {
        if (!id) return
        setLoading(true)
        try {
            const data = await getTicketDetails(id as string)
            setTicket(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!reply.trim()) return
        setSending(true)
        try {
            await addTicketMessage(id as string, reply)
            setReply("")
            loadTicket() // Refresh chat
        } catch (e) {
            console.error(e)
        } finally {
            setSending(false)
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-orange-600" /></div>
    if (!ticket) return <div className="p-8 text-center text-gray-500">Ticket not found</div>

    return (
        <div className="h-full flex flex-col max-h-[calc(100vh-100px)]">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit mb-4">
                <span className="hover:text-orange-600 cursor-pointer flex items-center gap-1" onClick={() => router.push('/dashboard')}>
                    Home
                </span>
                <span className="text-gray-300">/</span>
                <span className="hover:text-orange-600 cursor-pointer" onClick={() => router.push('/dashboard/support')}>Help & Support</span>
                <span className="text-gray-300">/</span>
                <span className="hover:text-orange-600 cursor-pointer" onClick={() => router.push('/dashboard/support/tickets')}>My Tickets</span>
                <span className="text-gray-300">/</span>
                <span className="font-medium text-orange-600">{ticket.ticketNumber}</span>
            </div>

            {/* Header */}
            <div className="border-b pb-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{ticket.ticketNumber}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : ticket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : ticket.status === 'WAITING_FOR_CUSTOMER' ? 'bg-purple-100 text-purple-700' : ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {ticket.status.replace(/_/g, ' ')}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 ml-10">{ticket.subject}</h1>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-auto space-y-4 p-4 bg-gray-50 rounded-xl border mb-4">
                {/* Original Issue */}
                <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold text-sm text-gray-900">{ticket.user?.username || 'You'}</span>
                            <span className="text-xs text-gray-400">{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <div className="bg-white p-3 rounded-tr-xl rounded-b-xl border shadow-sm text-sm text-gray-700 whitespace-pre-wrap">
                            {ticket.messages?.[0]?.message || 'No description provided'}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {ticket.messages?.slice(1).map((msg: any) => {
                    const isSupport = msg.sender?.role === 'SUPER_ADMIN' || !msg.senderId
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isSupport ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSupport ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                {isSupport ? <Shield className="h-4 w-4 text-orange-600" /> : <User className="h-4 w-4 text-blue-600" />}
                            </div>
                            <div className={`flex-1 space-y-1 flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-sm text-gray-900">{isSupport ? 'Support Agent' : 'You'}</span>
                                    <span className="text-xs text-gray-400">{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                                </div>
                                <div className={`p-3 rounded-xl border shadow-sm text-sm whitespace-pre-wrap ${isSupport ? 'bg-orange-50 text-gray-800 rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none'}`}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Reply Box */}
            <div className="p-4 bg-white border rounded-xl shadow-sm flex items-end gap-3">
                <Textarea
                    placeholder="Type a reply..."
                    className="min-h-[60px] resize-none"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                />
                <Button onClick={handleSend} disabled={sending || !reply.trim()} className="h-[60px] w-[60px] bg-orange-600 hover:bg-orange-700 text-white flex-col gap-1">
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="text-[10px]">Send</span>
                </Button>
            </div>
        </div>
    )
}
