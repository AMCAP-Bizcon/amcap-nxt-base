import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { ResponsiveToolbar } from '@/components/ui/responsive-toolbar'

interface StandardDetailFormProps {
    title: ReactNode;
    headerActions?: ReactNode;
    formActions?: ReactNode;
    onClose: () => void;
    /** When true, hides the close button entirely. */
    hideClose?: boolean;
    children: ReactNode;
}

/**
 * A wrapper for the detail pane in a Master/Detail pattern.
 * Includes a header with title, close button, and slots for form and header actions.
 */
export function StandardDetailForm({ title, headerActions, formActions, onClose, hideClose = false, children }: StandardDetailFormProps) {
    return (
        <div className="w-full h-full bg-card flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Unified Top Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    {headerActions}
                </div>
                {formActions && (
                    <ResponsiveToolbar className="flex-1 -my-0 py-0">
                        {formActions}
                    </ResponsiveToolbar>
                )}
                {!hideClose && (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Title Section */}
            {title && (
                <div className="px-4 md:px-6 pt-4 shrink-0">
                    <div className="text-xl font-semibold tracking-tight truncate w-full">
                        {title}
                    </div>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
                {children}
            </div>
        </div>
    )
}
