import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-900 text-white">
            <div className="container mx-auto py-20 px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold mb-4">Choose Your Growth Plan</h1>
                    <p className="text-xl text-slate-400">Scalable solutions for every stage of your food business.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Basic */}
                    <div className="border border-slate-700 bg-slate-800 rounded-2xl p-8 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold">Basic</h3>
                            <p className="text-slate-400">For solo entrepreneurs.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold">₹999</span>
                            <span className="text-slate-400"> / month</span>
                        </div>
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3"><Check className="text-green-500" /> Single Outlet</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Billing & Tax</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Basic Reports</li>
                        </div>
                        <Button variant="outline" className="w-full text-black" disabled>Current Plan</Button>
                    </div>

                    {/* Pro */}
                    <div className="border-2 border-amber-500 bg-slate-800 rounded-2xl p-8 flex flex-col relative scale-105 shadow-2xl shadow-amber-900/20">
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl" />
                        <div className="absolute top-4 right-4 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-amber-500">Pro</h3>
                            <p className="text-slate-400">For growing restaurants.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold">₹4,999</span>
                            <span className="text-slate-400"> / year</span>
                        </div>
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3"><Check className="text-green-500" /> All Basic Features</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Kitchen Display (KDS)</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Recipe & Inventory</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Customer Loyalty</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> AI Forecasting</li>
                        </div>
                        <Link href="/checkout?plan=PRO&billing=ANNUAL">
                            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">Upgrade to Pro</Button>
                        </Link>
                    </div>

                    {/* Enterprise */}
                    <div className="border border-slate-700 bg-slate-800 rounded-2xl p-8 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold">Lifetime</h3>
                            <p className="text-slate-400">One-time purchase.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold">₹24,999</span>
                            <span className="text-slate-400"> / forever</span>
                        </div>
                        <div className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3"><Check className="text-green-500" /> Multi-Store HQ</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Aggregator Audits</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> White Labeling</li>
                            <li className="flex gap-3"><Check className="text-green-500" /> Dedicated Support</li>
                        </div>
                        <Link href="/checkout?plan=ENTERPRISE&billing=PERPETUAL">
                            <Button variant="outline" className="w-full text-black">Get Lifetime</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
