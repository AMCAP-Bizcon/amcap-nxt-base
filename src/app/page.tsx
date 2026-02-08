import { createClient } from '@/utils/supabase/server' // Import the SERVER client

export default async function Home() {
  // 1. Initialize the client
  const supabase = await createClient()

  // 2. Fetch the user safely on the server
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        {user ? (
          <p>Logged in as: {user.email}</p>
        ) : (
          <p>You are not logged in.</p>
        )}
      </div>
    </main>
  )
}