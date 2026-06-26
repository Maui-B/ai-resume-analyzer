// app/lib/supabase.ts
// Typed Supabase client. Singleton — call `getSupabase()` to use.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { env, isSupabaseConfigured } from './env';

let client: SupabaseClient<Database> | null = null;

/** Returns the Supabase client. Returns null when not configured (use mock data). */
export function getSupabase(): SupabaseClient<Database> | null {
    if (!isSupabaseConfigured()) return null;
    if (client) return client;

    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
    return client;
}

/** Convenience: get the current Supabase session user id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
}
