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
        <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                    {subtitle && (
                        <p className="text-xs text-gray-400">{subtitle}</p>
                    )}
                    {change !== undefined && change !== null && !isNaN(change) && (
                        <div className={cn("flex items-center gap-1 text-sm font-medium mt-2", getTrendColor())}>
                            {getTrendIcon()}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                            <span className="text-gray-400 text-xs">vs last period</span>
                        </div>
                    )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    {icon}
                </div>
            </div>
        </div>
    )
}
