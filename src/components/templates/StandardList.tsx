import { ReactNode } from 'react'
import { ResponsiveToolbar } from '@/components/ui/responsive-toolbar'

interface StandardListProps {
    title?: ReactNode;
    toolbarActions?: ReactNode;
    children: ReactNode;
}

/**
 * A wrapper for the left-hand main list in a Master/Detail pattern.
 * Provides a standard header, a slot for toolbar actions, and scrollable content.
 */
export function StandardList({ title, toolbarActions, children }: StandardListProps) {
    return (
        <div className="flex-1 flex flex-col h-full bg-transparent min-h-0">
            {(title || toolbarActions) && (
                <div className="flex flex-col shrink-0 p-4 border-b border-border/50 bg-card/50 gap-3">
                    {title && <div className="text-xl font-semibold">{title}</div>}
                    {toolbarActions && (
                        <ResponsiveToolbar>
                            {toolbarActions}
                        </ResponsiveToolbar>
                    )}
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {children}
            </div>
        </div>
    )
}
