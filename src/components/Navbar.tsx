import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

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
                            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Dashboard
                            </Link>
                            <form action={logout}>
                                <Button variant="outline" type="submit">Log out</Button>
                            </form>
                        </>
                    ) : (
                        <Link href="/login">
                            <Button variant="outline">Log in</Button>
                        </Link>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    )
}