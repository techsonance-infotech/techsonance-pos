'use client'

import { useState } from "react"
import { toggleMaintenanceMode, blockIP, unblockIP } from "@/app/actions/security"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { AlertTriangle, ShieldAlert, Lock, Globe, Server } from "lucide-react"

interface SecurityControlsProps {
    initialRules: any[]
    maintenanceMode: boolean
    lockedCount: number
    currentIp: string
}

export function SecurityControls({ initialRules, maintenanceMode, lockedCount, currentIp }: SecurityControlsProps) {
    const [maintenance, setMaintenance] = useState(maintenanceMode)
    const [ipToBlock, setIpToBlock] = useState("")
    const [loading, setLoading] = useState(false)

    const handleMaintenanceToggle = async (checked: boolean) => {
        setMaintenance(checked)
        const result = await toggleMaintenanceMode(checked)
        if (result?.success) {
            toast.success(checked ? "Maintenance Mode ENABLED" : "System Online")
        } else {
            setMaintenance(!checked) // Revert on failure
            toast.error("Failed to update system config")
        }
    }

    const handleBlockIp = async () => {
        if (!ipToBlock) return
        setLoading(true)
        const result = await blockIP(ipToBlock, "Manual Block")
        if (result?.success) {
            toast.success(`Blocked IP: ${ipToBlock}`)
            setIpToBlock("")
        } else {
            toast.error(result?.error || "Failed to block IP")
        }
        setLoading(false)
    }

    const handleUnblock = async (ip: string) => {
        if (!confirm(`Unblock ${ip}?`)) return
        const result = await unblockIP(ip)
        if (result?.success) {
            toast.success("IP Unblocked")
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Kill Switch Card */}
            <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">Global Kill Switch</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-4">{maintenance ? "ACTIVE" : "INACTIVE"}</div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={maintenance}
                            onCheckedChange={handleMaintenanceToggle}
                            id="maintenance-mode"
                            className="data-[state=checked]:bg-red-600"
                        />
                        <label htmlFor="maintenance-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Maintenance Mode
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        When active, only Super Admins can access the system. User login is disabled.
                    </p>
                </CardContent>
            </Card>

            {/* Firewall Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Firewall Rules</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-2 mb-4">
                        <Input
                            placeholder="IP Address"
                            value={ipToBlock}
                            onChange={(e) => setIpToBlock(e.target.value)}
                        />
                        <Button variant="destructive" size="sm" onClick={handleBlockIp} disabled={loading}>Block</Button>
                    </div>
                    <div className="space-y-2 h-[200px] overflow-y-auto">
                        {initialRules.filter((r: any) => r.type === 'IP').length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">No active rules</div>
                        )}
                        {initialRules.filter((r: any) => r.type === 'IP').map((rule: any) => (
                            <div key={rule.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                <div className="font-mono">{rule.value}</div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleUnblock(rule.value)}>
                                    &times;
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* User Lock Stats */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{lockedCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Users permanently banned/locked.
                    </p>
                    <div className="mt-4 pt-4 border-t">
                        <span className="text-xs text-gray-500">Your IP: {currentIp}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
