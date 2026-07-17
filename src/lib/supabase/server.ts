import { createServerClient as _create } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function makeClient() {
  const cookieStore = await cookies()
  return _create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

export const createServerClient = makeClient
export const createClient = makeClient
