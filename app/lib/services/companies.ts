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
