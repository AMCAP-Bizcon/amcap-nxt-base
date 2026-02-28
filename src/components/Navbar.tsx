import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogIn, LogOut, Home } from 'lucide-react'

/**
 * Navbar Component
 * 
 * Renders the global navigation bar across the application.
 * It conditionally displays user information and a logout button if the user
 * is authenticated, or a login link if they are not. It also includes a theme toggle.
 * 
 * @returns React Server Component for the application header navigation.
 */
export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <nav className="border-b border-border bg-background p-4 shadow-sm transition-colors duration-300">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center justify-center group focus:outline-none w-10 h-10 rounded-xl border border-emerald-500/30 bg-background text-emerald-500 shadow-sm hover:border-emerald-500/60 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 ease-out"
                    aria-label="Home"
                >
                    <Home className="w-5 h-5 transition-transform group-hover:scale-110 duration-300 shrink-0" />
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
                            <form action={logout}>
                                <Button variant="outline" type="submit" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-[0_0_15px_rgba(244,63,94,0.5)] dark:hover:bg-rose-900/50">
                                    <LogOut className="w-4 h-4 mr-1.5" />
                                    Log out
                                </Button>
                            </form>
                        </>
                    ) : (
                        <Link href="/login">
                            <Button variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] dark:hover:bg-emerald-900/50">
                                <LogIn className="w-4 h-4 mr-1.5" />
                                Log in
                            </Button>
                        </Link>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    )
}