'use client'

import React, { useState, useEffect } from 'react'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { cn } from '@/lib/utils'

interface MasterDetailLayoutProps {
    listSlot: React.ReactNode;
    detailSlot?: React.ReactNode;
    isDetailOpen: boolean;
    containerClassName?: string;
    panelGroupClassName?: string;
}

/**
 * A generic layout wrapper that handles the responsive Master/Detail split-pane pattern.
 */
export function MasterDetailLayout({
    listSlot,
    detailSlot,
    isDetailOpen,
    containerClassName,
    panelGroupClassName
}: MasterDetailLayoutProps) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    return (
        <div className={cn("w-full flex flex-col max-h-full transition-all duration-300 ease-in-out", isDetailOpen ? 'max-w-full' : 'max-w-3xl mx-auto', containerClassName)}>
            <ResizablePanelGroup
                orientation={isMobile ? "vertical" : "horizontal"}
                className={cn(
                    "w-full flex-initial items-stretch rounded-lg border border-border bg-card/50 transition-shadow duration-300 ease-out overflow-hidden",
                    isMobile ? 'min-h-[400px]' : 'min-h-[100px]',
                    panelGroupClassName
                )}
            >
                {/* Left Panel: The List */}
                <ResizablePanel
                    defaultSize={isDetailOpen ? 35 : 100}
                    minSize={20}
                    className={cn("transition-all duration-300 ease-in-out h-full flex flex-col")}
                >
                    {listSlot}
                </ResizablePanel>

                {/* Right Panel: The Details Form */}
                {isDetailOpen && detailSlot && (
                    <>
                        <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />
                        <ResizablePanel
                            defaultSize={70}
                            minSize={40}
                            className="h-full animate-in slide-in-from-right-10 fade-in duration-300 flex flex-col"
                        >
                            {detailSlot}
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    )
}
