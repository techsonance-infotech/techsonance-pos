"use client"

import { useEffect, useState } from "react"
import { Home, Download, Trash2, Calendar, Loader2, Database, Cloud, Lock, HardDrive, RefreshCw, CheckCircle, XCircle, Clock, Settings2, Play } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    getBackupHistory,
    triggerManualBackup,
    deleteBackup,
    cleanupOldBackups,
    getBackupSchedule,
    updateBackupSchedule,
    syncToCloud
} from "@/app/actions/backup"
import { syncLocalToRemote } from "@/app/actions/merge-sync"
import { toast } from "sonner"

type BackupLog = {
    id: string
    type: string
    scope: string
    status: string
    fileName: string | null
    fileSize: number | null
    startedAt: Date
    completedAt: Date | null
    errorMessage: string | null
    triggeredBy: { username: string } | null
}

type BackupSchedule = {
    id: string
    frequency: string
    time: string
    dayOfWeek: number | null
    dayOfMonth: number | null
    retentionDays: number
    isEnabled: boolean
    lastRunAt: Date | null
    nextRunAt: Date | null
}

export default function BackupManagementPage() {
    const [backups, setBackups] = useState<BackupLog[]>([])
    const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isBackingUp, setIsBackingUp] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [showScheduleForm, setShowScheduleForm] = useState(false)

    const [scheduleForm, setScheduleForm] = useState({
        frequency: 'daily',
        time: '02:00',
        dayOfWeek: 0,
        dayOfMonth: 1,
        retentionDays: 30,
        isEnabled: false
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setIsLoading(true)

        const [historyResult, scheduleResult] = await Promise.all([
            getBackupHistory(20),
            getBackupSchedule()
        ])

        if (historyResult.backups) {
            setBackups(historyResult.backups)
        }

        if (scheduleResult.schedule) {
            setSchedule(scheduleResult.schedule)
            setScheduleForm({
                frequency: scheduleResult.schedule.frequency,
                time: scheduleResult.schedule.time,
                dayOfWeek: scheduleResult.schedule.dayOfWeek ?? 0,
                dayOfMonth: scheduleResult.schedule.dayOfMonth ?? 1,
                retentionDays: scheduleResult.schedule.retentionDays,
                isEnabled: scheduleResult.schedule.isEnabled
            })
        }

        setIsLoading(false)
    }

    async function handleManualBackup() {
        setIsBackingUp(true)
        toast.info("Starting backup... This may take a few minutes.")

        const result = await triggerManualBackup('FULL')

        if (result.success) {
            toast.success(result.message || "Backup completed successfully!")
            loadData()
        } else {
            toast.error(result.error || "Backup failed")
        }

        setIsBackingUp(false)
    }

    async function handleDeleteBackup(backupId: string) {
        if (!confirm("Are you sure you want to delete this backup?")) return

        const result = await deleteBackup(backupId)
        if (result.success) {
            toast.success("Backup deleted")
            loadData()
        } else {
            toast.error(result.error || "Failed to delete backup")
        }
    }

    async function handleSaveSchedule() {
        const result = await updateBackupSchedule(scheduleForm)
        if (result.success) {
            toast.success("Schedule updated")
            setShowScheduleForm(false)
            loadData()
        } else {
            toast.error(result.error || "Failed to update schedule")
        }
    }

    async function handleCleanup() {
        if (!confirm("This will delete all backups older than the retention period. Continue?")) return

        const result = await cleanupOldBackups()
        if (result.success) {
            toast.success(result.message)
            loadData()
        } else {
            toast.error(result.error || "Cleanup failed")
        }
    }

    // Cloud Sync (Postgres -> Postgres)
    async function handleCloudSync() {
        if (!confirm("⚠️ WARNING: This will OVERWRITE the data on the online database with your local data. Are you sure?")) return

        setIsSyncing(true)
        toast.info("Starting Cloud Sync... This may take a while.")

        // Target URL is now handled via ONLINE_DATABASE_URL env var on server
        const result = await syncToCloud()

        if (result.success) {
            toast.success("Cloud Sync completed successfully!")
        } else {
            toast.error(result.error || "Cloud Sync failed")
        }
        setIsSyncing(false)
    }

    // Offline Sync (SQLite -> Postgres)
    async function handleOfflineSync() {
        setIsSyncing(true)
        toast.info("Syncing Offline Data (SQLite)...")

        try {
            // Dynamic import to avoid build errors if not needed locally? No, direct import is fine if handled on server.
            // But we need to invoke the server action.
            const { syncOfflineData } = await import("@/app/actions/sync")
            const result = await syncOfflineData()

            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error("Failed to invoke sync action")
        }

        setIsSyncing(false)
    }

    // Merge Sync (Postgres -> Postgres, Safe)
    async function handleMergeSync() {
        if (!confirm("This will merge your local database with the online database. Existing remote data will be preserved. Continue?")) return

        setIsSyncing(true)
        toast.info("Starting Smart Merge Sync... This may take a while.")

        const result = await syncLocalToRemote()

        if (result.success) {
            toast.success(result.message)
            if (result.warnings) {
                toast.warning(result.warnings)
            }
        } else {
            toast.error(result.error || "Merge Sync failed")
        }
        setIsSyncing(false)
    }

    function formatFileSize(bytes: number | null): string {
        if (!bytes) return '-'
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    function formatDate(date: Date | string | null): string {
        if (!date) return '-'
        return new Date(date).toLocaleString()
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'FAILED':
                return <XCircle className="h-5 w-5 text-red-500" />
            case 'IN_PROGRESS':
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            default:
                return <Clock className="h-5 w-5 text-gray-400" />
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-fit">
                <Home className="h-4 w-4 text-orange-500" />
                <span>/</span>
                <a href="/dashboard/settings" className="hover:text-orange-600">Settings</a>
                <span>/</span>
                <span className="font-medium text-orange-600">Database Backup</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Database Backup</h1>
                    <p className="text-gray-500 mt-1">Backup and restore your POS data</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowScheduleForm(true)}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Schedule Settings
                    </Button>
                    <Button
                        onClick={handleManualBackup}
                        disabled={isBackingUp}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isBackingUp ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Backing up...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Create Backup
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Cloud Sync Card */}
            <div className="bg-white rounded-2xl border border-blue-100 p-6 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <Cloud className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Cloud Sync</h3>
                            <p className="text-sm text-gray-500">Sync local data to online database</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Option 1: Smart Merge Sync (RECOMMENDED) */}
                        <div className="p-4 border-2 rounded-lg bg-green-50/50 border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                                <RefreshCw className="h-4 w-4 text-green-600" />
                                <h4 className="font-semibold text-green-900">Smart Merge Sync</h4>
                            </div>
                            <p className="text-xs text-green-700/80 mb-4 h-10">
                                Safely merges local data with remote database.
                                <span className="font-bold block text-green-600">✓ Preserves existing data</span>
                            </p>
                            <Button
                                onClick={handleMergeSync}
                                disabled={isSyncing}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Merge to Cloud"}
                            </Button>
                        </div>

                        {/* Option 2: Full PG Dump Sync (DESTRUCTIVE) */}
                        <div className="p-4 border rounded-lg bg-orange-50/50 border-orange-100 opacity-75">
                            <h4 className="font-semibold text-orange-900 mb-1">Full DB Overwrite</h4>
                            <p className="text-xs text-orange-700/80 mb-4 h-10">
                                Overwrites online DB with local Postgres data.
                                <span className="font-bold block text-red-600">⚠️ Destructive Action</span>
                            </p>
                            <Button
                                onClick={handleCloudSync}
                                disabled={isSyncing}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                size="sm"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync (PG Dump)"}
                            </Button>
                        </div>

                        {/* Option 3: Offline SQLite Sync */}
                        <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-100">
                            <h4 className="font-semibold text-blue-900 mb-1">Offline Data Sync</h4>
                            <p className="text-xs text-blue-700/80 mb-4 h-10">
                                Merges SQLite products & categories to Cloud.
                                <span className="font-bold block text-blue-600">✨ Safe Merge</span>
                            </p>
                            <Button
                                onClick={handleOfflineSync}
                                disabled={isSyncing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync (SQLite)"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Status Card */}
            {schedule && (
                <div className={`bg-white rounded-2xl border p-6 ${schedule.isEnabled ? 'border-emerald-200' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${schedule.isEnabled ? 'bg-emerald-50' : 'bg-gray-100'
                                }`}>
                                <Calendar className={`h-6 w-6 ${schedule.isEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">
                                    Scheduled Backup: {schedule.isEnabled ? 'Enabled' : 'Disabled'}
                                </h3>
                                {schedule.isEnabled && (
                                    <p className="text-sm text-gray-500">
                                        {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} at {schedule.time}
                                        {schedule.frequency === 'weekly' && ` on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.dayOfWeek || 0]}`}
                                        {schedule.frequency === 'monthly' && ` on day ${schedule.dayOfMonth}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right text-sm">
                            {schedule.nextRunAt && schedule.isEnabled && (
                                <p className="text-gray-500">
                                    Next: <span className="font-medium text-gray-700">{formatDate(schedule.nextRunAt)}</span>
                                </p>
                            )}
                            <p className="text-gray-400">Retention: {schedule.retentionDays} days</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Form Modal */}
            {showScheduleForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">Backup Schedule Settings</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="enabled"
                                    checked={scheduleForm.isEnabled}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, isEnabled: e.target.checked })}
                                    className="h-5 w-5 text-emerald-600 rounded"
                                />
                                <label htmlFor="enabled" className="font-medium">Enable Automatic Backups</label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <select
                                    value={scheduleForm.frequency}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={scheduleForm.time}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {scheduleForm.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                                    <select
                                        value={scheduleForm.dayOfWeek}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                                            <option key={i} value={i}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {scheduleForm.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={scheduleForm.dayOfMonth}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfMonth: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Retention (days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={scheduleForm.retentionDays}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, retentionDays: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowScheduleForm(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveSchedule} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                    Save Schedule
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup History */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Backup History</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadData}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCleanup}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cleanup Old
                        </Button>
                    </div>
                </div>

                {backups.length === 0 ? (
                    <div className="text-center py-16">
                        <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Backups Yet</h3>
                        <p className="text-gray-400">Create your first backup to protect your data</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">File</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">By</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {backups.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(backup.status)}
                                                <span className="text-sm">{backup.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {backup.type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {backup.fileName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatFileSize(backup.fileSize)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(backup.startedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {backup.triggeredBy?.username || 'System'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {backup.fileName && (
                                                    <a
                                                        href={`/api/backup/download/${backup.id}`}
                                                        className="text-emerald-600 hover:text-emerald-700"
                                                        title="Download"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteBackup(backup.id)}
                                                    className="text-red-400 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
