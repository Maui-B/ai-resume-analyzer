// app/lib/services/companies.ts

import { getSupabase } from '../supabase';
import { isDemoMode } from '../demo-mode';
import { mockCompanies } from '../mock/companies';

export async function getMyCompany(): Promise<CompanyRow | null> {
    if (isDemoMode()) {
        return mockCompanies[0] ?? null;
    }
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
    if (!profile?.company_id) return null;
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();
    if (error) throw error;
    return data ?? mockCompanies[0] ?? null;
}

export async function createCompany(input: { name: string; website?: string }): Promise<CompanyRow> {
    if (isDemoMode()) {
        return {
            id: `co-${Date.now()}`,
            name: input.name,
            owner_id: 'demo-user',
            website: input.website ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await supabase
        .from('companies')
        .insert({
            name: input.name,
            owner_id: user.id,
            website: input.website ?? null,
        })
        .select('*')
        .single();
    if (error) throw error;
    // Also link the creator as owner in company_members + update profile.
    await supabase
        .from('company_members')
        .insert({ company_id: data.id, user_id: user.id, member_role: 'owner' });
    await supabase.from('profiles').update({ company_id: data.id, role: 'recruiter' }).eq('id', user.id);
    return data;
}

export async function joinCompany(companyId: string): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
        .from('company_members')
        .insert({ company_id: companyId, user_id: user.id, member_role: 'recruiter' });
    await supabase
        .from('profiles')
        .update({ company_id: companyId, role: 'recruiter' })
        .eq('id', user.id);
}

// ── Team Management Service ───────────────────────────────────────────

export interface CompanyMemberRow {
    company_id: string;
    user_id: string;
    member_role: 'owner' | 'recruiter';
    invited_at: string;
    full_name?: string | null;
    email?: string | null;
}

/** Get all members of the current user's company */
export async function listCompanyMembers(): Promise<CompanyMemberRow[]> {
    if (isDemoMode()) {
        return []; // demo mode has no real members table
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
        .from('company_members')
        .select(`
            company_id,
            user_id,
            member_role,
            invited_at,
            profiles!inner (full_name, email)
        `)
        .eq('company_id', profile.company_id);

    if (error) throw error;
    if (!data) return [];

    return data.map((m: {
        company_id: string;
        user_id: string;
        member_role: 'owner' | 'recruiter';
        invited_at: string;
        profiles: { full_name: string | null; email: string | null };
    }) => ({
        company_id: m.company_id,
        user_id: m.user_id,
        member_role: m.member_role,
        invited_at: m.invited_at,
        full_name: m.profiles?.full_name ?? null,
        email: m.profiles?.email ?? null,
    }));
}

/** Invite a new member by email — creates an auth user if none exists, then adds to company_members */
export async function inviteToCompany(email: string, role: 'recruiter'): Promise<{ success: boolean; error?: string }> {
    if (isDemoMode()) {
        return { success: true };
    }
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const {
        data: { user: admin },
    } = await supabase.auth.getUser();
    if (!admin) return { success: false, error: 'Not signed in' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', admin.id)
        .maybeSingle();
    if (!adminProfile?.company_id) return { success: false, error: 'No company assigned' };

    // Check if already a member
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (existing) {
        // Already registered — add to company_members
        const { error } = await supabase
            .from('company_members')
            .upsert(
                { company_id: adminProfile.company_id, user_id: existing.id, member_role: role },
                { onConflict: 'company_id,user_id' }
            );
        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    // Not yet registered — create auth user + profile + company_member
    const { error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password: generateRandomPassword(),
        email_confirm: true,
        user_metadata: { full_name: email.split('@')[0] },
    });
    if (signUpError) return { success: false, error: signUpError.message };

    const { data: newUser } = await supabase.auth.admin.listUsers();
    const targetUser = newUser.users.find((u) => u.email === email);
    if (targetUser) {
        await supabase.from('profiles').insert({
            id: targetUser.id,
            role: role as UserRole,
            full_name: email.split('@')[0],
            company_id: adminProfile.company_id,
        });
        await supabase.from('company_members').insert({
            company_id: adminProfile.company_id,
            user_id: targetUser.id,
            member_role: role,
        });
    }

    return { success: true };
}

/** Change a member's role */
export async function updateMemberRole(userId: string, newRole: 'owner' | 'recruiter'): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
        .from('company_members')
        .update({ member_role: newRole })
        .eq('user_id', userId);
    if (error) throw error;
}

/** Deactivate a member — removes from company_members and unlinks from company */
export async function deactivateMember(userId: string): Promise<void> {
    if (isDemoMode()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
        .from('company_members')
        .delete()
        .eq('user_id', userId);
    await supabase
        .from('profiles')
        .update({ company_id: null, role: null })
        .eq('id', userId);
}

function generateRandomPassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
}
