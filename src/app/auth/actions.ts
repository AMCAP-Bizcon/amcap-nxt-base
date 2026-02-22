'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // 1. Get data directly from the form
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. Sign in using the Supabase Auth
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Login Error:", error.message)
    return redirect('/login?error=Could not authenticate user')
  }

  // 3. Refresh the cache for the layout (so the navbar updates)
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error("Signup Error:", error.message)
    return redirect('/login?error=Could not create user')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Refresh the page data and send them to the login screen
  revalidatePath('/', 'layout')
  redirect('/login')
}