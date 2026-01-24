import { getCurrentShift, getShiftSummary } from "@/app/actions/shift"
import { ShiftClient } from "./shift-client"
import { getUserProfile } from "@/app/actions/user"

export default async function ShiftPage() {
    const user = await getUserProfile()
    const shiftData = await getShiftSummary()

    // If no active shift, shiftData is null or contains null shift
    // We pass this state to client to show "Open Shift" or "Manage Shift"

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Shift Management</h2>
            </div>

            <ShiftClient
                initialShift={shiftData?.shift || null}
                initialSummary={shiftData?.summary || null}
                userName={user?.username || 'Staff'}
                userRole={user?.role || 'USER'}
            />
        </div>
    )
}
