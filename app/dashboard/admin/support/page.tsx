'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    LifeBuoy, AlertCircle, Clock, CheckCircle, MessageSquare,
    Filter, Search, ChevronRight, User, Building2, Timer, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAdminTickets, getSupportStats } from "@/app/actions/support"
import { getSLASummary } from "@/app/actions/support-notifications"

// Status badge colors
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

type Ticket = {
    id: string
    ticketNumber: string
    subject: string
    category: string
    priority: string
    status: string
    createdAt: string
    updatedAt: string
    company: { name: string } | null
    store: { name: string } | null
    createdBy: { username: string, email: string }
    assignedTo: { username: string } | null
    _count: { messages: number }
}

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [stats, setStats] = useState<any>(null)
    const [slaSummary, setSlaSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        search: ''
    })

    const loadData = async () => {
        setLoading(true)
        const [ticketsRes, statsRes, slaRes] = await Promise.all([
            getAdminTickets({
                status: filters.status as any || undefined,
                priority: filters.priority as any || undefined,
                search: filters.search || undefined
            }),
            getSupportStats(),
            getSLASummary()
        ])

        if (!('error' in ticketsRes)) setTickets(ticketsRes.tickets || [])
        if (!('error' in statsRes)) setStats(statsRes)
        if (!('error' in slaRes)) setSlaSummary(slaRes)
        setLoading(false)
    }

    useEffect(() => { loadData() }, [])

    const handleSearch = () => loadData()

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Management</h1>
                    <p className="text-gray-500">Manage support tickets across all tenants</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
                                <p className="text-xs text-gray-500">Critical</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                                <p className="text-xs text-gray-500">Open</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                                <LifeBuoy className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                                <p className="text-xs text-gray-500">In Progress</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
                                <p className="text-xs text-gray-500">Waiting</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                                <p className="text-xs text-gray-500">Resolved</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
                                <p className="text-xs text-gray-500">Closed</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SLA Metrics */}
            {slaSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{slaSummary.responseBreaches}</p>
                                <p className="text-xs text-gray-500">Response SLA Breached</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                <Timer className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-orange-600">{slaSummary.resolutionBreaches}</p>
                                <p className="text-xs text-gray-500">Resolution SLA Breached</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{slaSummary.avgResponseTime || 'N/A'}</p>
                                <p className="text-xs text-gray-500">Avg Response Time</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{slaSummary.avgResolutionTime || 'N/A'}</p>
                                <p className="text-xs text-gray-500">Avg Resolution Time</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ticket # or subject..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="flex-1 border-none outline-none text-sm"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="WAITING_FOR_CUSTOMER">Waiting</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">All Priority</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                    >
                        <Filter className="h-4 w-4 inline mr-1" />
                        Apply
                    </button>
                </div>
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No tickets found</div>
                ) : (
                    <div className="divide-y">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/admin/support/${ticket.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition group"
                            >
                                {/* Priority Badge */}
                                <div className={cn("w-2 h-12 rounded-full",
                                    ticket.priority === 'CRITICAL' ? "bg-red-500" :
                                        ticket.priority === 'HIGH' ? "bg-orange-500" :
                                            ticket.priority === 'MEDIUM' ? "bg-yellow-400" : "bg-gray-300"
                                )} />

                                {/* Main Content */}
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
                                    <h3 className="font-medium text-gray-900 truncate group-hover:text-orange-600 transition">
                                        {ticket.subject}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {ticket.company?.name || 'N/A'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {ticket.createdBy.username}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            {ticket._count.messages} messages
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="text-right text-xs text-gray-500">
                                    <p>{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                    {ticket.assignedTo ? (
                                        <p className="text-green-600 mt-1">→ {ticket.assignedTo.username}</p>
                                    ) : (
                                        <p className="text-orange-500 mt-1">Unassigned</p>
                                    )}
                                </div>

                                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 transition" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
