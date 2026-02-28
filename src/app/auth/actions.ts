'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Authenticates a user with email and password.
 * Receives form data from the login form, passes credentials to Supabase,
 * and handles redirection upon success or failure.
 * 
 * @param {FormData} formData - The submitted form data containing 'email' and 'password'
 * @returns {Promise<never>} Redirects to the homepage on success or login page with error on failure
 */
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

/**
 * Registers a new user with email and password.
 * Passes the credentials to Supabase for account creation and redirects appropriately.
 * 
 * @param {FormData} formData - The submitted form data containing 'email' and 'password'
 * @returns {Promise<never>} Redirects to the homepage on success or login page with error on failure
 */
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

/**
 * Logs out the currently authenticated user.
 * Terminates the Supabase session, clears related data, and redirects to the login page.
 * 
 * @returns {Promise<never>} Redirects to the login page
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Refresh the page data and send them to the login screen
  revalidatePath('/', 'layout')
  redirect('/login')
}