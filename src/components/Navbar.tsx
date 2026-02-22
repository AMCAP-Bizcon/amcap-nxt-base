import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <nav className="border-b border-gray-200 bg-white p-4 shadow-sm">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600">
                    Amcap
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
                            <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-black">
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
                </div>
            </div>
        </nav>
    )
}