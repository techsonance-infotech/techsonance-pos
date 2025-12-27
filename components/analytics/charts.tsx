"use client"

interface BarChartProps {
    data: Array<{ label: string; value: number }>
    height?: number
    color?: string
    valuePrefix?: string
}

export function BarChart({ data, height = 300, color = '#3B82F6', valuePrefix = '' }: BarChartProps) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>
    }

    // Filter out invalid values and ensure all values are numbers
    const validData = data.map(item => ({
        ...item,
        value: typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0
    }))

    const maxValue = Math.max(...validData.map(d => d.value), 1) // Ensure at least 1 to avoid division by zero
    const barWidth = 100 / validData.length

    return (
        <div className="w-full">
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height="100%" className="overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
                        <g key={i}>
                            <line
                                x1="0"
                                y1={height * (1 - percent)}
                                x2="100%"
                                y2={height * (1 - percent)}
                                stroke="#E5E7EB"
                                strokeWidth="1"
                            />
                            <text
                                x="-10"
                                y={height * (1 - percent) + 4}
                                fontSize="12"
                                fill="#9CA3AF"
                                textAnchor="end"
                            >
                                {valuePrefix}{(maxValue * percent).toFixed(0)}
                            </text>
                        </g>
                    ))}

                    {/* Bars */}
                    {validData.map((item, index) => {
                        const barHeight = (item.value / maxValue) * (height - 40)
                        const x = `${index * barWidth}%`
                        const y = height - barHeight - 30

                        return (
                            <g key={index}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={`${barWidth * 0.8}%`}
                                    height={barHeight}
                                    fill={color}
                                    rx="4"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                >
                                    <title>{item.label}: {valuePrefix}{item.value.toFixed(2)}</title>
                                </rect>
                                <text
                                    x={`${index * barWidth + barWidth * 0.4}%`}
                                    y={height - 10}
                                    fontSize="11"
                                    fill="#6B7280"
                                    textAnchor="middle"
                                    className="select-none"
                                >
                                    {item.label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </div>
    )
}

interface LineChartProps {
    data: Array<{ label: string; value: number }>
    height?: number
    color?: string
    valuePrefix?: string
}

export function LineChart({ data, height = 300, color = '#10B981', valuePrefix = '' }: LineChartProps) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>
    }

    // Filter out invalid values and ensure all values are numbers
    const validData = data.map(item => ({
        ...item,
        value: typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0
    }))

    const maxValue = Math.max(...validData.map(d => d.value))
    const minValue = Math.min(...validData.map(d => d.value))
    const range = maxValue - minValue || 1

    const points = validData.map((item, index) => {
        const x = (index / (validData.length - 1)) * 100
        const y = 100 - ((item.value - minValue) / range) * 80
        return `${x},${y}`
    }).join(' ')

    return (
        <div className="w-full">
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Grid */}
                    {[0, 25, 50, 75, 100].map((y, i) => (
                        <line
                            key={i}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="#E5E7EB"
                            strokeWidth="0.2"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}

                    {/* Area under line */}
                    <polygon
                        points={`0,100 ${points} 100,100`}
                        fill={color}
                        fillOpacity="0.1"
                    />

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Points */}
                    {validData.map((item, index) => {
                        const x = (index / (validData.length - 1)) * 100
                        const y = 100 - ((item.value - minValue) / range) * 80

                        return (
                            <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="1"
                                fill={color}
                                vectorEffect="non-scaling-stroke"
                                className="hover:r-2 transition-all cursor-pointer"
                            >
                                <title>{item.label}: {valuePrefix}{item.value.toFixed(2)}</title>
                            </circle>
                        )
                    })}
                </svg>
            </div>
            {/* Labels */}
            <div className="flex justify-between mt-2 px-2">
                {validData.map((item, index) => (
                    <span key={index} className="text-xs text-gray-500">
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    )
}

interface PieChartProps {
    data: Array<{ label: string; value: number; color?: string }>
    size?: number
}

export function PieChart({ data, size = 200 }: PieChartProps) {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>
    }

    // Filter and Validate
    const validData = data.map(item => ({
        ...item,
        value: typeof item.value === 'number' && !isNaN(item.value) ? Math.max(0, item.value) : 0
    }))

    const total = validData.reduce((sum, item) => sum + item.value, 0)

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2" style={{ height: size }}>
                <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Activity</span>
                </div>
            </div>
        )
    }

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    let currentAngle = -90 // Start from top

    return (
        <div className="flex items-center gap-8">
            <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
                {validData.map((item, index) => {
                    const percentage = (item.value / total) * 100
                    const angle = (percentage / 100) * 360

                    // Handle single item 100% case to avoid arc drawing errors
                    if (percentage === 100) {
                        return (
                            <circle
                                key={index}
                                cx="50"
                                cy="50"
                                r="40"
                                fill={item.color || colors[index % colors.length]}
                            >
                                <title>{item.label}: 100%</title>
                            </circle>
                        )
                    }

                    const startAngle = currentAngle
                    const endAngle = currentAngle + angle

                    // Calculate path
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = 50 + 40 * Math.cos(startRad)
                    const y1 = 50 + 40 * Math.sin(startRad)
                    const x2 = 50 + 40 * Math.cos(endRad)
                    const y2 = 50 + 40 * Math.sin(endRad)

                    // SVG Arc flag: large-arc-flag
                    const largeArc = angle > 180 ? 1 : 0

                    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`

                    currentAngle = endAngle

                    return (
                        <path
                            key={index}
                            d={path}
                            fill={item.color || colors[index % colors.length]}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                            stroke="white"
                            strokeWidth="1"
                        >
                            <title>{item.label}: {percentage.toFixed(1)}%</title>
                        </path>
                    )
                })}
            </svg>

            {/* Legend */}
            <div className="space-y-2">
                {validData.map((item, index) => {
                    const percentage = (item.value / total) * 100
                    return (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: item.color || colors[index % colors.length] }}
                            />
                            <span className="text-sm text-gray-700">
                                {item.label} ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
