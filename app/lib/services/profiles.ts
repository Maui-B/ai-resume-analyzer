// app/lib/services/profiles.ts
// Components never call Supabase directly — they go through services.

import { getSupabase } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockProfiles } from '../mock/profiles';

export interface AppUser {
    id: string;
    email: string | null;
    fullName: string | null;
    role: UserRole | null;
    companyId: string | null;
}

function rowToAppUser(row: ProfileRow): AppUser {
    return {
        id: row.id,
        email: null, // email comes from auth, not profiles
        fullName: row.full_name,
        role: row.role,
        companyId: row.company_id,
    };
}

export async function getMyProfile(): Promise<AppUser | null> {
    if (isDemoMode()) {
        const { useAuthStore } = await import('../auth');
        return useAuthStore.getState().user;
    }
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...rowToAppUser(data), email: authUser.email ?? null };
}

export async function updateMyRole(role: UserRole): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (error) throw error;
}

export async function listDemoProfiles(): Promise<ProfileRow[]> {
    return mockProfiles;
}
