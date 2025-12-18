"use client"

import { useActionState } from "react"
import { broadcastNotification } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Send } from "lucide-react"

// Create a simple textarea since we don't have the shadcn component handy
function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
        />
    )
}

function Select({ name, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }) {
    return (
        <select
            name={name}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
        >
            <option value="ALL">All Users</option>
            <option value="BUSINESS_OWNER">Business Owners</option>
            <option value="USER">Staff</option>
        </select>
    )
}

export default function AdminNotificationPage() {
    const [state, action, isPending] = useActionState(broadcastNotification, null)

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notification Center</h1>
                <p className="text-gray-500 mt-1">Broadcast messages to your system users.</p>
            </div>

            <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-stone-800">
                <form action={action} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Notification Title</Label>
                        <Input id="title" name="title" placeholder="e.g. System Maintenance" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="targetRole">Target Audience</Label>
                        <Select name="targetRole" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" placeholder="Type your message here..." required />
                    </div>

                    {state?.error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium animate-in fade-in">
                            {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm font-medium animate-in fade-in">
                            {state.success}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={isPending}
                    >
                        {isPending ? "Sending..." : (
                            <>
                                <Send className="mr-2 h-5 w-5" /> Send Broadcast
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
