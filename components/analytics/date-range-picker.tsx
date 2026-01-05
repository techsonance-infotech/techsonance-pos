"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns"

interface DateRangePickerProps {
    startDate: Date
    endDate: Date
    onDateChange: (start: Date, end: Date) => void
}

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const presets = [
        { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
        { label: 'Yesterday', getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
        { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
        { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
        { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
        { label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
    ]

    const handlePresetClick = (preset: typeof presets[0]) => {
        const { start, end } = preset.getValue()
        onDateChange(start, end)
        setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-3">Quick Select</p>
                    <div className="grid grid-cols-2 gap-2">
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                variant="outline"
                                size="sm"
                                onClick={() => handlePresetClick(preset)}
                                className="justify-start"
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
