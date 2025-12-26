import { AboutSection } from "@/components/settings/about-section"
import { Home } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl shadow-sm w-fit">
                <Link href="/dashboard" className="hover:text-orange-500 transition-colors">
                    <Home className="h-4 w-4 text-orange-500" />
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="text-gray-400 hover:text-orange-600 transition-colors">
                    More Options
                </Link>
                <span>/</span>
                <span className="font-medium text-orange-600">About</span>
            </div>

            {/* About Section */}
            <AboutSection />
        </div>
    )
}
