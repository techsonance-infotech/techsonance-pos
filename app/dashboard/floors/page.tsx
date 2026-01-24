import { getFloors } from "@/app/actions/restaurant"
import { FloorClient } from "./floor-client"

export default async function FloorsPage() {
    const res = await getFloors()
    const floors = res.floors || []

    return (
        <div className="flex-1 h-[calc(100vh-4rem)] p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Floor Management</h2>
            </div>
            <FloorClient initialFloors={floors} />
        </div>
    )
}
