import { login, signup } from '@/app/auth/actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <form className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-4 mt-4">
          {/* This button triggers the 'login' server action */}
          <button
            formAction={login}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Log in
          </button>
          
          {/* This button triggers the 'signup' server action */}
          <button
            formAction={signup}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  )
}