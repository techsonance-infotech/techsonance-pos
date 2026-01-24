'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createReservation, checkInReservation } from "@/app/actions/restaurant"
import { toast } from "sonner"
import { Calendar as CalendarIcon, Clock, Users, Phone, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

interface ReservationClientProps {
    initialReservations: any[]
    floors: any[]
}

export function ReservationClient({ initialReservations, floors }: ReservationClientProps) {
    const [reservations, setReservations] = useState(initialReservations)

    // New Reservation Form
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [guests, setGuests] = useState(2)
    const [time, setTime] = useState("19:00")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]) // YYYY-MM-DD

    const allTables = floors.flatMap(f => f.tables)

    const handleCreate = async () => {
        const fullTime = new Date(`${date}T${time}:00`)
        const res = await createReservation({
            name, phone, guests,
            time: fullTime.toISOString()
        })
        if (res.success) {
            toast.success("Reservation confirmed")
            window.location.reload()
        }
    }

    const handleCheckIn = async (resId: string, tableId: string) => {
        const res = await checkInReservation(resId, tableId)
        if (res.success) {
            toast.success("Guest Seated")
            window.location.reload()
        } else {
            toast.error("Check-in failed")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                <div className="flex gap-2 items-center">
                    <CalendarIcon className="w-5 h-5 text-slate-500" />
                    <span className="font-bold">{format(new Date(), "MMMM d, yyyy")}</span>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>New Reservation</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input placeholder="Guest Name" value={name} onChange={e => setName(e.target.value)} />
                            <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                            <div className="flex gap-2">
                                <Input type="number" placeholder="Guests" value={guests} onChange={e => setGuests(parseInt(e.target.value))} />
                                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                            </div>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                            <Button onClick={handleCreate}>Confirm Booking</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {reservations.length === 0 && (
                    <div className="text-center py-10 text-slate-500">No reservations for today.</div>
                )}

                {reservations.map(r => (
                    <Card key={r.id} className={r.status === 'SEATED' ? "opacity-50" : ""}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <div className="text-center min-w-[60px]">
                                    <div className="font-bold text-lg">{format(new Date(r.reservationTime), "HH:mm")}</div>
                                    <div className="text-xs text-muted-foreground uppercase">{r.status}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{r.customerName}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> {r.customerPhone}
                                        <span className="text-slate-300">|</span>
                                        <Users className="w-3 h-3" /> {r.guests} Guests
                                    </div>
                                    {r.notes && <div className="text-xs text-amber-600 mt-1">{r.notes}</div>}
                                </div>
                            </div>

                            {r.status === 'PENDING' || r.status === 'CONFIRMED' ? (
                                <div className="flex gap-2">
                                    <Select onValueChange={(tId) => handleCheckIn(r.id, tId)}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Assign Table" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allTables.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id} disabled={t.status === 'OCCUPIED'}>
                                                    {t.name} ({t.capacity}p) {t.status === 'OCCUPIED' ? '(Busy)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="flex items-center text-green-600 font-bold gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> Seated at {r.table?.name || 'Table'}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
