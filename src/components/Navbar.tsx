import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogIn, LogOut } from 'lucide-react'

export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <nav className="border-b border-border bg-background p-4 shadow-sm transition-colors duration-300">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600">
                    Amcap
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