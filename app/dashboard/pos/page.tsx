import { getFloors } from "@/app/actions/restaurant"
import { PosTableMap } from "./table-map"

export default async function POSMapPage() {
    // Re-using same action as Floor Manager, but this view is for Operations
    const res = await getFloors()
    const floors = res.floors || []

    return (
        <div className="flex-1 h-[calc(100vh-4rem)] p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Table Selection</h2>
                <div className="text-sm text-muted-foreground flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-white border border-slate-400"></span> Vacant</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-400"></span> Occupied</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-400"></span> Reserved</span>
                </div>
            </div>
            <PosTableMap initialFloors={floors} />
        </div>
    )
}
