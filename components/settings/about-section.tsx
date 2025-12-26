"use client"

import { Building2, Mail, Globe, MapPin, Phone, MessageCircle, Code2, Zap, Shield, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export function AboutSection() {
    const businessInfo = {
        name: "TechSonance InfoTech LLP",
        tagline: "Where Innovation Finds Its Resonance",
        description: "TechSonance InfoTech LLP is a leading software development company specializing in custom enterprise solutions and cutting-edge Point of Sale systems. With a team of experienced developers and technology enthusiasts, we transform business challenges into elegant software solutions. Our expertise spans full-stack development, cloud architecture, mobile applications, and enterprise software. We leverage modern technologies like React, Next.js, Node.js, and PostgreSQL to build scalable, secure, and user-centric applications. From concept to deployment, we partner with businesses to deliver innovative software that drives growth, enhances efficiency, and creates exceptional user experiences.",
        address: "UG-15, Palladium Plaza, VIP Road, Vesu, Surat, Gujarat - 395007, India",
        email: "info@techsonance.co.in",
        phone: "+91 91731 01711",
        website: "https://www.techsonance.co.in",
        whatsapp: "919173101711",
        whatsappDisplay: "+91 91731 01711"
    }

    return (
        <div className="space-y-12 max-w-7xl mx-auto">
            {/* Hero Section with Gradient Background */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-blue-600 p-16 md:p-20 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -ml-48 -mb-48"></div>

                <div className="relative z-10 text-center space-y-6">
                    <div className="mb-4">
                        <Image
                            src="/techsonance-logo.png"
                            alt="TechSonance InfoTech LLP Logo"
                            width={120}
                            height={120}
                            className="object-contain mx-auto"
                        />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                        {businessInfo.name}
                    </h1>
                    <p className="text-2xl text-orange-100 font-light max-w-3xl mx-auto">
                        {businessInfo.tagline}
                    </p>
                </div>
            </div>

            {/* About Section with Modern Card */}
            <div className="px-4 md:px-0">
                <Card className="p-10 md:p-12 bg-gradient-to-br from-white to-gray-50 shadow-xl rounded-3xl border-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-100 to-blue-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                                <Code2 className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
                                About Us
                            </h2>
                        </div>
                        <p className="text-gray-700 text-lg leading-relaxed">
                            {businessInfo.description}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Contact Information - Premium Grid */}
            <div className="px-4 md:px-0">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Address Card */}
                    <Card className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Our Location</h3>
                                <p className="text-gray-600 leading-relaxed">{businessInfo.address}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Email Card */}
                    <Card className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Mail className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Email Us</h3>
                                <a
                                    href={`mailto:${businessInfo.email}`}
                                    className="text-purple-600 hover:text-purple-700 font-medium hover:underline transition-colors text-lg"
                                >
                                    {businessInfo.email}
                                </a>
                            </div>
                        </div>
                    </Card>

                    {/* Phone Card */}
                    <Card className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Phone className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Call Us</h3>
                                <a
                                    href={`tel:${businessInfo.phone}`}
                                    className="text-green-600 hover:text-green-700 font-medium hover:underline transition-colors text-lg"
                                >
                                    {businessInfo.phone}
                                </a>
                            </div>
                        </div>
                    </Card>

                    {/* Website Card */}
                    <Card className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Globe className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Visit Website</h3>
                                <a
                                    href={businessInfo.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors text-lg"
                                >
                                    {businessInfo.website.replace('https://', '')}
                                </a>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* WhatsApp CTA - Eye-catching Design */}
            <div className="px-4 md:px-0 mt-12">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-10 md:p-12 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -ml-48 -mb-48"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left text-white">
                            <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                                <MessageCircle className="h-8 w-8" />
                                <h2 className="text-3xl md:text-4xl font-bold">Need Assistance?</h2>
                            </div>
                            <p className="text-green-100 text-lg max-w-xl">
                                Connect with our team on WhatsApp for instant support, queries, and consultation
                            </p>
                        </div>
                        <Link
                            href={`https://wa.me/${businessInfo.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                size="lg"
                                className="bg-white text-green-600 hover:bg-green-50 shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg px-10 py-7 rounded-2xl font-bold hover:scale-105"
                            >
                                <MessageCircle className="h-6 w-6 mr-3" />
                                Connect on WhatsApp
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Grid - Premium Design */}
            <div className="px-4 md:px-0 mt-12">
                <div className="grid md:grid-cols-3 gap-8">
                    <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                <Zap className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-3 text-xl">Lightning Fast</h3>
                            <p className="text-gray-600 leading-relaxed">High-performance solutions with 99.9% uptime guarantee</p>
                        </div>
                    </Card>

                    <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                <Shield className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-3 text-xl">Bank-Grade Security</h3>
                            <p className="text-gray-600 leading-relaxed">Enterprise-level encryption and data protection</p>
                        </div>
                    </Card>

                    <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                <Users2 className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-3 text-xl">Expert Support</h3>
                            <p className="text-gray-600 leading-relaxed">24/7 dedicated support from our expert team</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 md:px-0 mt-12">
                <div className="text-center pt-8 border-t border-gray-200">
                    <p className="text-gray-500 font-medium">© 2025 {businessInfo.name}. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}
