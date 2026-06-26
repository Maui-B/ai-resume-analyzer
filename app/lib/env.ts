// app/lib/env.ts
// Read Vite env vars with safe defaults for demo mode.

export const env = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
    usePuterAi: import.meta.env.VITE_USE_PUTER_AI !== 'false',
} as const;

export function isSupabaseConfigured(): boolean {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
