'use client'

import { FileText, ChevronRight, Home } from "lucide-react"
import Link from "next/link"

export default function UserGuidesPage() {
    const guides = [
        { title: "Getting Started with SyncServe POS", description: "Basic setup and navigation overview." },
        { title: "Creating Your First Invoice", description: "Step-by-step guide to billing and checkout." },
        { title: "Managing Inventory & Stock", description: "How to add products, stock entries, and purchase orders." },
        { title: "Understanding Tax Reports", description: "Guide to GST reports and export functionality." },
        { title: "Table Management & Reservations", description: "How to use the table floor plan effectively." },
    ]

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/support" className="hover:text-orange-600 transition-colors">
                    Help & Support
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">User Guides</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">User Guides & Tutorials</h1>
            <div className="grid gap-4">
                {guides.map((guide, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors flex items-center justify-between group cursor-pointer">
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{guide.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{guide.description}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-orange-400" />
                    </div>
                ))}
            </div>
        </div>
    )
}
