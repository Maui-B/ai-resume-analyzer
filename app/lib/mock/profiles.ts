// app/lib/mock/profiles.ts
import type { ProfileRow } from '../../../types/index';

export const mockProfiles: ProfileRow[] = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        role: 'jobseeker',
        full_name: 'Demo Jobseeker',
        company_id: null,
        created_at: '2026-06-01T08:00:00Z',
        updated_at: '2026-06-01T08:00:00Z',
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        role: 'recruiter',
        full_name: 'Demo Recruiter',
        company_id: '33333333-3333-3333-3333-333333333333',
        created_at: '2026-06-01T08:00:00Z',
        updated_at: '2026-06-01T08:00:00Z',
    },
    {
        id: '66666666-6666-6666-6666-666666666666',
        role: 'company_admin',
        full_name: 'Demo Company Admin',
        company_id: '33333333-3333-3333-3333-333333333333',
        created_at: '2026-06-01T08:00:00Z',
        updated_at: '2026-06-01T08:00:00Z',
    },
];
