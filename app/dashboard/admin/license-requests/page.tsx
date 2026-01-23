import { getAllLicenseRequests, getPendingLicenseRequestsCount } from "@/app/actions/license-request"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { Home, ChevronRight, MessageSquare, Clock, CheckCircle, XCircle, Upload, Eye } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PaymentConfigDialog } from "@/components/admin/payment-config-dialog"

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-blue-100 text-blue-700', icon: Clock },
    PAYMENT_UPLOADED: { label: 'Verify Payment', color: 'bg-purple-100 text-purple-700', icon: Upload },
    VERIFIED: { label: 'Verified', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle }
}

export default async function AdminLicenseRequestsPage() {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') {
        redirect('/dashboard')
    }

    const [requests, pendingCount] = await Promise.all([
        getAllLicenseRequests(),
        getPendingLicenseRequestsCount()
    ])

    if ('error' in requests) {
        return <div className="text-red-500">{requests.error}</div>
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/settings" className="hover:text-orange-600 transition-colors">
                    More Options
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">License Requests</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg relative">
                        <MessageSquare className="h-8 w-8 text-white" />
                        {pendingCount > 0 && (
                            <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">License Requests</h1>
                        <p className="text-gray-500 mt-1">
                            {requests.length} total requests • {pendingCount} pending action
                        </p>
                    </div>
                </div>
                <PaymentConfigDialog />
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Company</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Plan</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Last Message</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Date</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No license requests yet
                                </td>
                            </tr>
                        ) : (
                            requests.map((req: any) => {
                                const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING
                                const StatusIcon = status.icon
                                const lastMessage = req.messages[0]

                                return (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{req.company.name}</div>
                                            <div className="text-sm text-gray-500">{req.requestedBy.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{req.planType}</div>
                                            <div className="text-sm text-gray-500">₹{req.planPrice.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.color)}>
                                                <StatusIcon className="h-3 w-3" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-sm text-gray-600 truncate">
                                                {lastMessage?.content || 'No messages'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/dashboard/admin/license-requests/${req.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
