"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FeedbackFormProps {
    orderId: string
    onSkip: () => void
    onSubmit: (rating: number, comment: string) => Promise<void>
}

export function FeedbackForm({ orderId, onSkip, onSubmit }: FeedbackFormProps) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating")
            return
        }
        setSubmitting(true)
        try {
            await onSubmit(rating, comment)
            toast.success("Thank you for your feedback!")
        } catch (error) {
            toast.error("Failed to submit feedback")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 max-w-sm w-full mx-auto animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Rate your experience</h3>
                <p className="text-sm text-slate-500">How was the food and service?</p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                    >
                        <Star
                            className={cn(
                                "w-8 h-8 transition-colors",
                                rating >= star ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
                            )}
                        />
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <Textarea
                    placeholder="Tell us what you liked or how we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white"
                />

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={onSkip} disabled={submitting}>
                        Skip
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={rating === 0 || submitting}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {submitting ? "Sending..." : "Submit Review"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
