import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string
    value: string | number
    change?: number
    icon: React.ReactNode
    trend?: 'up' | 'down' | 'neutral'
    subtitle?: string
}

export function StatCard({ title, value, change, icon, trend, subtitle }: StatCardProps) {
    const getTrendColor = () => {
        if (!trend) return 'text-gray-500'
        if (trend === 'up') return 'text-green-600'
        if (trend === 'down') return 'text-red-600'
        return 'text-gray-500'
    }

    const getTrendIcon = () => {
        if (!trend || trend === 'neutral') return <Minus className="h-4 w-4" />
        if (trend === 'up') return <TrendingUp className="h-4 w-4" />
        return <TrendingDown className="h-4 w-4" />
    }

    return (
        <div className="group relative overflow-hidden bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 opacity-50 blur-xl group-hover:scale-150 transition-transform duration-500" />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{value}</h3>
                    {subtitle && (
                        <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
                    )}
                    {change !== undefined && change !== null && !isNaN(change) && (
                        <div className={cn("flex items-center gap-1.5 text-sm font-medium mt-3", getTrendColor())}>
                            <div className={cn("p-0.5 rounded-full", trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100')}>
                                {getTrendIcon()}
                            </div>
                            <span>{Math.abs(change).toFixed(1)}%</span>
                            <span className="text-gray-400 text-xs font-normal">vs last period</span>
                        </div>
                    )}
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 flex items-center justify-center text-blue-600 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
        </div>
    )
}
