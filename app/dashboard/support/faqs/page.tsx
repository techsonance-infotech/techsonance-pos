'use client'

import { useState, useEffect } from "react"
import { getFaqs, seedFaqs } from "@/app/actions/support"
import { Input } from "@/components/ui/input"
import { Search, ChevronDown, ChevronUp, Home, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function FaqPage() {
    const [faqs, setFaqs] = useState<any[]>([])
    const [search, setSearch] = useState("")
    const [openId, setOpenId] = useState<string | null>(null)

    useEffect(() => {
        // Seed if empty (just for demo)
        seedFaqs().then(() => loadFaqs())
    }, [])

    useEffect(() => {
        loadFaqs()
    }, [search])

    async function loadFaqs() {
        const data = await getFaqs('ALL', search)
        setFaqs(data)
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit mb-6">
                <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
                    <Home className="h-4 w-4" />
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/support" className="hover:text-orange-600 transition-colors">
                    Help & Support
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-orange-600">FAQs</span>
            </div>

            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
                <p className="text-gray-500">Find quick answers to common support questions.</p>
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                    placeholder="Search for answers..."
                    className="pl-10 h-12 text-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {faqs.map((faq) => (
                    <div key={faq.id} className="bg-white border rounded-xl overflow-hidden shadow-sm transition-all">
                        <button
                            onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 bg-white"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-800">{faq.question}</span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{faq.category}</span>
                            </div>
                            {openId === faq.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {openId === faq.id && (
                            <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50 bg-gray-50/50">
                                {faq.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
