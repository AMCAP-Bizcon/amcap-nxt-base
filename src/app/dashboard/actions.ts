'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'

export async function createTodo(formData: FormData) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Extract the text from the form
    const text = formData.get('todoText') as string

    // 3. Insert into the database via Drizzle
    await db.insert(todos).values({
        text: text,
        userId: user.id,
    })

    // 4. Tell Next.js to refresh the dashboard page to show the new data
    revalidatePath('/dashboard')
}