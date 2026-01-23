"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    FileText, Calendar, Filter, User, Search,
    ChevronLeft, ChevronRight, Loader2, ArrowLeft, RefreshCw, Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getActivityLogs, getLogFilters } from "@/app/actions/logs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function ActivityLogsPage() {
    const router = useRouter()
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [modules, setModules] = useState<string[]>([])
    const [users, setUsers] = useState<any[]>([])

    // Filters
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filterModule, setFilterModule] = useState("ALL")
    const [filterUser, setFilterUser] = useState("ALL")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [selectedLog, setSelectedLog] = useState<any>(null)

    useEffect(() => {
        loadFilters()
        loadLogs()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== debouncedSearch) {
                setDebouncedSearch(search)
                setPage(1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        loadLogs(1)
    }, [filterModule, filterUser, dateFrom, dateTo, debouncedSearch])

    useEffect(() => {
        loadLogs(page)
    }, [page])

    async function loadFilters() {
        const data = await getLogFilters()
        setModules(data.modules)
        setUsers(data.users)
    }

    async function loadLogs(pageNum = page) {
        setLoading(true)
        try {
            const data = await getActivityLogs({
                page: pageNum,
                limit: 20,
                module: filterModule,
                userId: filterUser,
                startDate: dateFrom,
                endDate: dateTo,
                search: debouncedSearch
            })
            setLogs(data.logs)
            setTotalPages(data.totalPages)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit animate-in fade-in slide-in-from-top-2">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">More Options</Link>
                <span>/</span>
                <span className="font-medium text-orange-600">Activity Logs</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-orange-600" />
                        Activity Logs
                    </h1>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadLogs()} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="space-y-2 w-full sm:w-[300px]">
                    <label className="text-xs font-semibold text-gray-500">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search logs..."
                            className="pl-9"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-gray-500">Module</label>
                    <Select value={filterModule} onValueChange={setFilterModule}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Modules" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Modules</SelectItem>
                            {modules.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-gray-500">User</label>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Users</SelectItem>
                            {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-gray-500">From Date</label>
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-[160px]"
                    />
                </div>

                <div className="space-y-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-gray-500">To Date</label>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-[160px]"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 sticky top-0">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Module</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-center">Sync</th>
                                <th className="px-6 py-4 text-right">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        No logs found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {log.user?.username || <span className="text-gray-400 italic">Unknown</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded-md text-xs border border-gray-200">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                {log.module}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="truncate text-gray-600 max-w-[300px]" title={log.details}>
                                                {log.details.length > 50 ? log.details.substring(0, 50) + "..." : log.details}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={cn(
                                                "h-2 w-2 rounded-full mx-auto",
                                                log.isSynced ? "bg-green-500" : "bg-gray-300"
                                            )} title={log.isSynced ? "Synced to Cloud" : "Local Only"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                                <Search className="h-4 w-4 text-blue-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        Page {page} of {totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Log Details Dialog */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-600" />
                                Log Details
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">&times;</span>
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Timestamp</label>
                                    <p className="font-medium text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">User</label>
                                    <p className="font-medium text-gray-900">{selectedLog.user?.username || "Unknown"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Action</label>
                                    <p className="font-medium text-gray-900">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Module</label>
                                    <p className="font-medium text-gray-900">{selectedLog.module}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Full Details</label>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                                    {(() => {
                                        try {
                                            return JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                                        } catch (e) {
                                            return selectedLog.details
                                        }
                                    })()}
                                </div>
                            </div>

                            <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                <div>
                                    <span className="font-semibold">Log ID:</span> {selectedLog.id}
                                </div>
                                <div>
                                    <span className="font-semibold">Sync Status:</span> {selectedLog.isSynced ? "Synced" : "Local Only"}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setSelectedLog(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
