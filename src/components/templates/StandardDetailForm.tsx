import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface StandardDetailFormProps {
    title: ReactNode;
    headerActions?: ReactNode;
    formActions?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}

/**
 * A wrapper for the detail pane in a Master/Detail pattern.
 * Includes a header with title, close button, and slots for form and header actions.
 */
export function StandardDetailForm({ title, headerActions, formActions, onClose, children }: StandardDetailFormProps) {
    return (
        <div className="w-full h-full bg-card flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shadow-sm flex-shrink-0 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {headerActions}
                    <div className="text-xl font-semibold tracking-tight truncate flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                        {title}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </Button>
            </div>
            
            {/* Form Actions (Toolbar) */}
            {formActions && (
                <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0 overflow-x-auto scrollbar-hide flex items-center gap-2">
                    {formActions}
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
                {children}
            </div>
        </div>
    )
}
