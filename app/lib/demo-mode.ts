// app/lib/demo-mode.ts
// Single source of truth for "are we using bundled mocks instead of Supabase?"

import { env, isSupabaseConfigured } from './env';

let runtimeOverride: boolean | null = null;

/** True when the app should serve bundled mocks instead of hitting Supabase. */
export function isDemoMode(): boolean {
    if (runtimeOverride !== null) return runtimeOverride;
    if (env.demoMode) return true;
    if (!isSupabaseConfigured()) return true;
    return false;
}

/** Allow runtime override (e.g. after a failed Supabase call in production). */
export function setDemoMode(value: boolean): void {
    runtimeOverride = value;
}
