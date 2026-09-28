import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Cookie writes throw inside Server Components (Next.js only allows them in
 * Server Actions and Route Handlers); the middleware already refreshes the
 * session cookie, so swallowing that error is safe.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* called from a Server Component - ignore */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* called from a Server Component - ignore */
          }
        },
      },
    }
  );
}
