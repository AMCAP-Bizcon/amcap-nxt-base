"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * ThemeProvider Component
 * 
 * A client-side wrapper around next-themes to provide dark/light mode context
 * cleanly to the rest of the application tree.
 * 
 * @param React.ComponentProps<typeof NextThemesProvider> - Standard provider props
 * @returns React Client Component providing theme context
 */
export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
