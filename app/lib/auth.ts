// app/lib/auth.ts
// Auth store. Backed by Supabase Auth.
// Components should use this instead of usePuterStore for identity/role.

import { create } from 'zustand';
import { getSupabase } from './supabase';
import type { UserRole } from '../../types/index';

interface AppUser {
    id: string;
    email: string | null;
    fullName: string | null;
    role: UserRole | null;
    companyId: string | null;
}

interface AuthState {
    user: AppUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    initialized: boolean;

    init: () => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    setRole: (role: UserRole, companyId?: string) => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    initialized: false,

    async init() {
        if (get().initialized) return;
        const supabase = getSupabase();
        set({ isLoading: true });
        if (!supabase) {
            // Demo mode: no real auth. Synthesize a "demo user" with no role so
            // onboarding can run.
            set({
                initialized: true,
                isLoading: false,
                user: {
                    id: 'demo-user',
                    email: 'demo@local',
                    fullName: 'Demo User',
                    role: null,
                    companyId: null,
                },
                isAuthenticated: true,
            });
            return;
        }

        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
            await loadProfile(session.user.id, set);
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await loadProfile(session.user.id, set);
            } else {
                set({ user: null, isAuthenticated: false });
            }
        });

        set({ initialized: true, isLoading: false });
    },

    async signUp(email, password, fullName) {
        const supabase = getSupabase();
        if (!supabase) {
            set({ error: 'Sign-up is unavailable in demo mode.' });
            return;
        }
        set({ isLoading: true, error: null });
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        await get().refreshProfile();
        set({ isLoading: false });
    },

    async signIn(email, password) {
        const supabase = getSupabase();
        if (!supabase) {
            set({ error: 'Sign-in is unavailable in demo mode.' });
            return;
        }
        set({ isLoading: true, error: null });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        await get().refreshProfile();
        set({ isLoading: false });
    },

    async signOut() {
        const supabase = getSupabase();
        if (supabase) await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
    },

    async refreshProfile() {
        const supabase = getSupabase();
        if (!supabase) return;
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) await loadProfile(authUser.id, set);
    },

    async setRole(role, companyId) {
        const supabase = getSupabase();
        const { user } = get();
        if (!supabase || !user) {
            set({ error: 'Cannot set role in demo mode.' });
            return;
        }
        set({ isLoading: true, error: null });
        const update: { role: UserRole; company_id?: string } = { role };
        if (companyId !== undefined) update.company_id = companyId;
        const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        set({
            user: { ...user, role, companyId: companyId ?? user.companyId },
            isLoading: false,
        });
    },

    clearError() {
        set({ error: null });
    },
}));

async function loadProfile(
    userId: string,
    set: (partial: Partial<AuthState>) => void,
): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    if (error) {
        set({ error: error.message });
        return;
    }
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();
    set({
        user: {
            id: userId,
            email: authUser?.email ?? null,
            fullName: data?.full_name ?? null,
            role: (data?.role as UserRole | null) ?? null,
            companyId: data?.company_id ?? null,
        },
        isAuthenticated: true,
    });
}
