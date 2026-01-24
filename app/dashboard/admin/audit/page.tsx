import { getAuditLogs } from "@/app/actions/audit-retrieval"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { AlertCircle, ArrowLeft, CheckCircle, Search } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

import { AuditFilters } from "./audit-filters"

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
    const { module } = await searchParams
    const logs = await getAuditLogs({ module })

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/admin/users">
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Audit Trails</h2>
                        <p className="text-muted-foreground text-sm">Monitor system integrity and user actions</p>
                    </div>
                </div>
            </div>

            <AuditFilters />

            <Card className="border-none shadow-md">
                <CardHeader className="border-b bg-gray-50/50">
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        System Activity Feed
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Module</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Changes</TableHead>
                                    <TableHead>Sync Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(log.createdAt), "dd MMM HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.module}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{log.action}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{log.user?.username || 'System'}</span>
                                                <span className="text-xs text-muted-foreground">{log.user?.role}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.entityType} <span className="text-muted-foreground text-xs">#{log.entityId?.slice(0, 5)}</span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {log.changedFields ? (
                                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                    {log.changedFields}
                                                </code>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {log.isSynced ? (
                                                <span className="text-green-500 flex items-center gap-1 text-xs">
                                                    <CheckCircle className="h-3 w-3" /> Cloud
                                                </span>
                                            ) : (
                                                <span className="text-orange-500 flex items-center gap-1 text-xs">
                                                    <AlertCircle className="h-3 w-3" /> Local
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center p-4 text-muted-foreground">
                                            No logs found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
