'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { getTickets } from "@/app/actions/support"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare, Plus, Search, Filter, Home, ChevronRight } from "lucide-react"
import { format } from "date-fns"

export default function TicketListPage() {
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState("ALL")

    useEffect(() => {
        loadTickets()
    }, [filterStatus])

    async function loadTickets() {
        setLoading(true)
        try {
            const data = await getTickets({ status: filterStatus === 'ALL' ? undefined : filterStatus })
            setTickets(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/support" className="hover:text-orange-600 transition-colors">
                    Help & Support
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">My Tickets</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
                    <p className="text-gray-500">Track status of your support requests</p>
                </div>
                <Link href="/dashboard/support/create">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        <Plus className="h-4 w-4" /> New Ticket
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <FilterButton active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')}>All</FilterButton>
                <FilterButton active={filterStatus === 'OPEN'} onClick={() => setFilterStatus('OPEN')}>Open</FilterButton>
                <FilterButton active={filterStatus === 'IN_PROGRESS'} onClick={() => setFilterStatus('IN_PROGRESS')}>In Progress</FilterButton>
                <FilterButton active={filterStatus === 'WAITING_FOR_CUSTOMER'} onClick={() => setFilterStatus('WAITING_FOR_CUSTOMER')}>Waiting</FilterButton>
                <FilterButton active={filterStatus === 'RESOLVED'} onClick={() => setFilterStatus('RESOLVED')}>Resolved</FilterButton>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                        <p>No tickets found in this category.</p>
                    </div>
                ) : (
                    <div className="overflow-auto divide-y divide-gray-100">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/support/tickets/${ticket.id}`}
                                className="block p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{ticket.ticketNumber}</span>
                                            <span className="font-medium text-gray-900">{ticket.subject}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-3">
                                            <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                            <span>•</span>
                                            <span>{ticket.category}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={ticket.status} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function FilterButton({ active, children, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${active
                ? 'bg-orange-100 text-orange-700 border-orange-200 border'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
        >
            {children}
        </button>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        OPEN: "bg-blue-100 text-blue-700",
        IN_PROGRESS: "bg-amber-100 text-amber-700",
        WAITING_FOR_CUSTOMER: "bg-purple-100 text-purple-700",
        RESOLVED: "bg-green-100 text-green-700",
        CLOSED: "bg-gray-100 text-gray-700"
    }
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] || styles.CLOSED}`}>
            {status.replace('_', ' ')}
        </span>
    )
}
