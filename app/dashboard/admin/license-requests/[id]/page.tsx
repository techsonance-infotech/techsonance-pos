import { getLicenseRequestById } from "@/app/actions/license-request"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { Home, ChevronRight, MessageSquare } from "lucide-react"
import Link from "next/link"
import { AdminLicenseChat } from "@/components/admin/admin-license-chat"

export const dynamic = 'force-dynamic'

export default async function AdminLicenseRequestDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const user = await getUserProfile()
    if (user?.role !== 'SUPER_ADMIN') {
        redirect('/dashboard')
    }

    const { id } = await params
    const request = await getLicenseRequestById(id)

    if ('error' in request) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-red-500">{request.error}</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/admin/license-requests" className="hover:text-orange-600 transition-colors">
                    License Requests
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">{request.company.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{request.company.name}</h1>
                    <p className="text-gray-500 mt-1">
                        {request.planType} Plan • ₹{request.planPrice.toLocaleString()} • {request.requestedBy.email}
                    </p>
                </div>
            </div>

            {/* Chat */}
            <AdminLicenseChat request={request as any} />
        </div>
    )
}
