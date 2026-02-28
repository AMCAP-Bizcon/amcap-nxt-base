import { login, signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, UserPlus } from 'lucide-react'

/**
 * LoginPage Component
 * 
 * Renders the authentication interface for the application.
 * Provides a form for users to enter their email and password to either
 * log into an existing account or sign up for a new one. It uses Server
 * Actions for form submission.
 * 
 * @returns React Server Component for the login and signup functionality.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <form className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-card text-card-foreground p-8 shadow-md border border-border">
        <h1 className="text-2xl font-bold">Welcome Back</h1>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Email</span>
          <Input
            name="email"
            type="email"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Password</span>
          <Input
            name="password"
            type="password"
            required
            minLength={6}
          />
        </label>

        <div className="flex gap-4 mt-4">
          {/* This button triggers the 'login' server action */}
          <Button
            variant="outline"
            formAction={login}
            className="flex-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] dark:hover:bg-emerald-900/50"
          >
            <LogIn className="w-4 h-4 mr-1.5" />
            Log in
          </Button>

          {/* This button triggers the 'signup' server action */}
          <Button
            variant="outline"
            formAction={signup}
            className="flex-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] dark:hover:bg-violet-900/50"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Sign up
          </Button>
        </div>
      </form>
    </div>
  )
}