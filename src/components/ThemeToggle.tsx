"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

/**
 * ThemeToggle Component
 * 
 * Toggles between light and dark modes using `next-themes`.
 * State is persisted in localStorage. It uses a mounted check
 * to prevent hydration mismatches between server and client rendering.
 * 
 * @returns React Client Component for the theme toggle button.
 */
export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Ensure component is mounted to avoid hydration mismatches
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="outline" size="icon" className="w-10 h-10 p-0" disabled>
                <div className="h-[1.2rem] w-[1.2rem] animate-pulse rounded-full bg-muted" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        )
    }

    const currentTheme = theme === "system" ? resolvedTheme : theme

    return (
        <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 p-0"
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
        >
            {currentTheme === "dark" ? (
                <Moon className="h-[1.2rem] w-[1.2rem] text-primary" />
            ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] text-primary" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
