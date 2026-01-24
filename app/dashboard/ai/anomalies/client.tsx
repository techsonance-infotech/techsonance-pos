'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ShieldCheck, FileWarning } from "lucide-react"

interface AnomalyClientProps {
    initialData: any
}

export function AnomalyClient({ initialData }: AnomalyClientProps) {
    const { anomalies } = initialData || {}

    if (!anomalies || anomalies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-4 border rounded-lg bg-slate-50">
                <ShieldCheck className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground">No suspicious activity detected in the last 30 days.</p>
            </div>
        )
    }

    const highRisk = anomalies.filter((a: any) => a.severity === 'HIGH')
    const mediumRisk = anomalies.filter((a: any) => a.severity === 'MEDIUM')
    const lowRisk = anomalies.filter((a: any) => a.severity === 'LOW')

    return (
        <div className="space-y-6">
            {/* Risk Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">High Risk Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div className="text-2xl font-bold">{highRisk.length}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mediumRisk.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Monitored Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{anomalies.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Leaderboard */}
            <Card>
                <CardHeader>
                    <CardTitle>Risk Scoreboard</CardTitle>
                    <CardDescription>
                        Staff flagged for high cancellation rates or excessive discounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {anomalies.map((user: any) => (
                            <div key={user.userId} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-lg">{user.name}</div>
                                        <Badge variant={user.severity === 'HIGH' ? 'destructive' : user.severity === 'MEDIUM' ? 'secondary' : 'outline'}>
                                            {user.severity} RISK
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Total Orders: {user.stats.totalOrders}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {user.flags.map((flag: string) => (
                                            <Badge key={flag} variant="outline" className="bg-red-50 text-red-900 border-red-200">
                                                {flag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase">Cancel Rate</div>
                                        <div className={`font-bold ${parseFloat(user.stats.cancelRate) > 10 ? 'text-red-600' : ''}`}>
                                            {user.stats.cancelRate}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase">Discount Rate</div>
                                        <div className={`font-bold ${parseFloat(user.stats.discountRate) > 15 ? 'text-red-600' : ''}`}>
                                            {user.stats.discountRate}%
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-1">
                                        <div className="text-xs text-muted-foreground uppercase">Total Discount Given</div>
                                        <div className="font-mono">₹{user.stats.totalDiscount}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
