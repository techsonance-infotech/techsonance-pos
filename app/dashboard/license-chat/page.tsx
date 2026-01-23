import { getMyLicenseRequest } from "@/app/actions/license-request"
import { LicenseChat } from "@/components/license/license-chat"
import { PlanSelectionModal } from "@/components/license/plan-selection-modal"
import { getUserProfile } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { Home, ChevronRight, MessageSquare, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function LicenseChatPage() {
    const user = await getUserProfile()
    if (!user) {
        redirect('/')
    }

    const request = await getMyLicenseRequest()

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">License Support</span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                        <MessageSquare className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">License Support</h1>
                        <p className="text-gray-500 mt-1">Chat with our team to purchase or activate your license</p>
                    </div>
                </div>

                {!request && (
                    <PlanSelectionModal
                        trigger={
                            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Request License
                            </Button>
                        }
                    />
                )}
            </div>

            {/* Chat */}
            <LicenseChat initialRequest={request as any} />
        </div>
    )
}
