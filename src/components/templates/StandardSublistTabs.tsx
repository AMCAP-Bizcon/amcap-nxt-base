'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabConfig {
    id: string;
    label: string;
    content: ReactNode;
}

interface StandardSublistTabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    /** When true, prevents switching to a different tab. */
    disableTabSwitch?: boolean;
    className?: string;
}

/**
 * A generic wrapper for managing sublist tabs in the detail view.
 */
export function StandardSublistTabs({ tabs, activeTab, onTabChange, disableTabSwitch = false, className }: StandardSublistTabsProps) {
    const activeContent = tabs.find(t => t.id === activeTab)?.content;

    return (
        <div className={cn("flex flex-col", className)}>
            <div className="flex flex-wrap border-b border-border mb-4">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const isLocked = disableTabSwitch && !isActive;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                                isActive
                                    ? 'border-b-2 border-primary text-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                                isLocked && 'opacity-40 cursor-not-allowed hover:text-muted-foreground'
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            <div>
                {activeContent}
            </div>
        </div>
    )
}
