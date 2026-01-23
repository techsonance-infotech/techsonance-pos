'use client'

import Link from "next/link"
import {
    LifeBuoy, MessageSquarePlus, FileText, Phone,
    BookOpen, HelpCircle, ChevronRight, Info
} from "lucide-react"

export default function SupportDashboard() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <LifeBuoy className="h-7 w-7 text-orange-600" />
                    Help & Support
                </h1>
                <p className="text-gray-500 mt-1">Get help, find answers, and contact our support team.</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SupportCard
                    href="/dashboard/support/faqs"
                    icon={<HelpCircle className="h-6 w-6 text-blue-600" />}
                    title="FAQs"
                    description="Find answers to common questions about billing, taxes, and more."
                    color="bg-blue-50 hover:bg-blue-100 border-blue-100"
                />

                <SupportCard
                    href="/dashboard/support/create"
                    icon={<MessageSquarePlus className="h-6 w-6 text-orange-600" />}
                    title="Raise a Ticket"
                    description="Facing an issue? Submit a support request and track its status."
                    color="bg-orange-50 hover:bg-orange-100 border-orange-100"
                />

                <SupportCard
                    href="/dashboard/support/tickets"
                    icon={<FileText className="h-6 w-6 text-purple-600" />}
                    title="My Tickets"
                    description="View history of your support requests and admin replies."
                    color="bg-purple-50 hover:bg-purple-100 border-purple-100"
                />

                <SupportCard
                    href="/dashboard/support/contact"
                    icon={<Phone className="h-6 w-6 text-green-600" />}
                    title="Contact Support"
                    description="Reach us via WhatsApp, Email, or Phone Call."
                    color="bg-green-50 hover:bg-green-100 border-green-100"
                />

                <SupportCard
                    href="/dashboard/support/guides"
                    icon={<BookOpen className="h-6 w-6 text-teal-600" />}
                    title="User Guides"
                    description="Step-by-step tutorials on using the POS effectively."
                    color="bg-teal-50 hover:bg-teal-100 border-teal-100"
                />
            </div>


        </div>
    )
}

function SupportCard({ href, icon, title, description, color }: any) {
    return (
        <Link href={href} className={`group p-6 rounded-xl border transition-all duration-200 block ${color}`}>
            <div className="flex items-start justify-between">
                <div className="p-3 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </div>
            <h3 className="mt-4 font-bold text-gray-900 text-lg">{title}</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {description}
            </p>
        </Link>
    )
}
