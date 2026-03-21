'use client'

import { useState, useEffect } from 'react'
import { getChangelogs } from '@/app/changelogs/actions'
import { History } from 'lucide-react'

interface ChangelogViewerProps {
    tableName: string;
    recordId: string | number;
}

export function ChangelogViewer({ tableName, recordId }: ChangelogViewerProps) {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true)
            try {
                const data = await getChangelogs(tableName, recordId)
                setLogs(data)
            } catch (error) {
                console.error("Failed to fetch changelogs", error)
            } finally {
                setLoading(false)
            }
        }
        if (recordId) {
            fetchLogs()
        }
    }, [tableName, recordId])

    return (
        <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-muted-foreground" /> Change History
            </h3>
            
            {loading ? (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div> 
                    Loading history...
                </div>
            ) : logs.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground italic bg-muted/30 rounded-lg border border-border/50">
                    No change history found.
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="relative pl-5 border-l-2 border-primary/20 pb-4 last:border-transparent last:pb-0">
                            <div className="absolute w-2.5 h-2.5 rounded-full bg-primary -left-[5px] top-1.5 ring-4 ring-background" />
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-semibold">{log.user?.displayName || log.user?.email || 'Unknown User'}</span>
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                                    {log.action}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="text-sm bg-muted/40 rounded-md p-2.5 mt-2 font-mono text-xs overflow-x-auto border border-border/50">
                                <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
