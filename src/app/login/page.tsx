import { login, signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
            formAction={login}
            className="flex-1"
          >
            Log in
          </Button>

          {/* This button triggers the 'signup' server action */}
          <Button
            variant="outline"
            formAction={signup}
            className="flex-1"
          >
            Sign up
          </Button>
        </div>
      </form>
    </div>
  )
}