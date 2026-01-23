"use client"

import { useState } from "react"
import { Clock, X } from "lucide-react"
import { PlanSelectionModal } from "@/components/license/plan-selection-modal"
import { Button } from "@/components/ui/button"

interface TrialBannerProps {
    daysRemaining: number
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) {
        return null
    }

    const isUrgent = daysRemaining <= 2

    return (
        <div className={`
            flex items-center justify-between px-4 py-2 text-sm font-medium
            ${isUrgent
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
            }
        `}>
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                    You are on a <strong>7-day free trial</strong>.
                    {daysRemaining > 0 ? (
                        <> <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> remaining.</>
                    ) : (
                        <> Trial expires today!</>
                    )}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <PlanSelectionModal
                    trigger={
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 bg-white/20 hover:bg-white/30 text-white border-0"
                        >
                            Get License
                        </Button>
                    }
                />
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
