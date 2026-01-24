import { getReservations } from "@/app/actions/restaurant"
import { ReservationClient } from "./reservation-client"
import { getFloors } from "@/app/actions/restaurant"

export default async function ReservationsPage() {
    // Default to today
    const res = await getReservations(new Date())
    const floorRes = await getFloors()

    return (
        <div className="flex-1 h-[calc(100vh-4rem)] p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Reservations</h2>
            </div>
            <ReservationClient
                initialReservations={res.reservations || []}
                floors={floorRes.floors || []}
            />
        </div>
    )
}
