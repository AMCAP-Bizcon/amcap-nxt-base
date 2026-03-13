'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Context that communicates whether the toolbar is in compact (icon-only) mode.
 * Child `ToolbarButton` components read this to decide their rendering style.
 */
const ToolbarCompactContext = createContext(false)

/** Threshold (px) below which the toolbar switches to compact (icon-only) mode. */
const DEFAULT_COMPACT_BREAKPOINT = 400

/** Viewport width (px) below which compact mode is always forced (mobile). */
const MOBILE_VIEWPORT_BREAKPOINT = 768

interface ResponsiveToolbarProps {
  /** Toolbar child elements — typically `ToolbarButton` components. */
  children: React.ReactNode
  /** Container width (px) below which buttons become icon-only. @default 400 */
  compactBreakpoint?: number
  /** Additional CSS classes for the toolbar container. */
  className?: string
}

/**
 * ResponsiveToolbar
 *
 * A flex container for toolbar buttons that measures its own width via ResizeObserver
 * and switches child `ToolbarButton` components to icon-only mode when the container
 * becomes too narrow. Buttons always wrap instead of introducing a horizontal scrollbar.
 *
 * On mobile viewports (< 768px) compact mode is always active regardless of container size.
 */
export function ResponsiveToolbar({
  children,
  compactBreakpoint = DEFAULT_COMPACT_BREAKPOINT,
  className,
}: ResponsiveToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isCompact, setIsCompact] = useState(false)

  /**
   * Computes whether compact mode should be active based on the container width
   * and the current viewport width.
   */
  const evaluate = useCallback(() => {
    // Force compact on mobile viewports
    if (typeof window !== 'undefined' && window.innerWidth < MOBILE_VIEWPORT_BREAKPOINT) {
      setIsCompact(true)
      return
    }
    if (containerRef.current) {
      setIsCompact(containerRef.current.offsetWidth < compactBreakpoint)
    }
  }, [compactBreakpoint])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Initial evaluation
    evaluate()

    // ResizeObserver for container-level changes (e.g. panel resize)
    const ro = new ResizeObserver(() => evaluate())
    ro.observe(el)

    // Window resize listener for viewport-level changes (e.g. mobile rotation)
    window.addEventListener('resize', evaluate)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', evaluate)
    }
  }, [evaluate])

  return (
    <ToolbarCompactContext.Provider value={isCompact}>
      <div
        ref={containerRef}
        className={cn(
          'flex items-center justify-center gap-2 flex-wrap py-4 px-2 -my-3',
          className
        )}
      >
        {children}
      </div>
    </ToolbarCompactContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// ToolbarButton
// ---------------------------------------------------------------------------

interface ToolbarButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  /** The icon element to render (always visible). */
  icon: React.ReactElement
  /** The text label (visible only when the toolbar is in expanded mode). */
  label: string
}

/**
 * ToolbarButton
 *
 * A button designed for use inside a `ResponsiveToolbar`. It reads the compact
 * context from the parent toolbar:
 * - **Expanded**: renders icon + text label side-by-side.
 * - **Compact**: renders icon-only with a `Tooltip` showing the label on hover.
 */
export function ToolbarButton({
  icon,
  label,
  className,
  size = 'sm',
  ...rest
}: ToolbarButtonProps) {
  const isCompact = useContext(ToolbarCompactContext)

  if (isCompact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            className={cn('shrink-0', className)}
            {...rest}
          >
            {React.cloneElement(icon, { className: cn('w-4 h-4', icon.props.className) })}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      size={size}
      className={cn('shrink-0', className)}
      {...rest}
    >
      {React.cloneElement(icon, { className: cn('w-4 h-4 mr-1.5', icon.props.className) })}
      <span>{label}</span>
    </Button>
  )
}
