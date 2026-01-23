'use client'

import { Phone, Mail, MessageCircle, MapPin, Clock, Home, ChevronRight, Globe } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ContactSupportPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
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
                <span className="font-medium text-orange-600">Contact Support</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Contact Channels */}
                <div className="space-y-4">
                    <ContactCard
                        icon={<MessageCircle className="h-6 w-6 text-green-600" />}
                        title="WhatsApp Chat"
                        value="+91 91731 01711"
                        action="Chat Now"
                        href="https://wa.me/919173101711"
                        color="bg-green-50 border-green-100"
                    />
                    <ContactCard
                        icon={<Phone className="h-6 w-6 text-blue-600" />}
                        title="Call Us"
                        value="+91 91731 01711"
                        action="Call Now"
                        href="tel:+919173101711"
                        color="bg-blue-50 border-blue-100"
                    />
                    <ContactCard
                        icon={<Mail className="h-6 w-6 text-purple-600" />}
                        title="Email Us"
                        value="info@techsonance.co.in"
                        action="Send Email"
                        href="mailto:info@techsonance.co.in"
                        color="bg-purple-50 border-purple-100"
                    />
                    <ContactCard
                        icon={<Globe className="h-6 w-6 text-orange-600" />}
                        title="Visit Website"
                        value="www.techsonance.co.in"
                        action="Visit Site"
                        href="https://www.techsonance.co.in"
                        color="bg-orange-50 border-orange-100"
                    />
                </div>

                {/* Info Side */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5 text-orange-600" />
                            Working Hours
                        </h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Monday - Friday</span>
                                <span className="font-medium text-gray-900">10:00 AM - 7:00 PM</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Saturday</span>
                                <span className="font-medium text-gray-900">10:00 AM - 4:00 PM</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                                <span>Sunday</span>
                                <span className="font-medium">Closed</span>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                            Expected response time: <span className="font-bold text-gray-900">Wait time &lt; 5 mins</span> usually.
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            Our Location
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            UG-15, Palladium Plaza,<br />
                            VIP Road, Vesu,<br />
                            Surat, Gujarat - 395007, India
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ContactCard({ icon, title, value, action, href, color }: any) {
    return (
        <div className={`p-6 rounded-xl border flex items-center justify-between ${color}`}>
            <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
            </div>
            <Button asChild variant="outline" className="bg-white hover:bg-gray-50">
                <a href={href} target="_blank" rel="noopener noreferrer">{action}</a>
            </Button>
        </div>
    )
}
