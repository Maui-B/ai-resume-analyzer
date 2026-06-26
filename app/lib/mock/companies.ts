// app/lib/mock/companies.ts
import type { CompanyRow } from '../../../types/index';

export const mockCompanies: CompanyRow[] = [
    {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Acme Talent Co.',
        owner_id: '22222222-2222-2222-2222-222222222222',
        website: 'https://acme.example.com',
        created_at: '2026-05-01T08:00:00Z',
        updated_at: '2026-05-01T08:00:00Z',
    },
    {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'BetaWorks',
        owner_id: '66666666-6666-6666-6666-666666666666',
        website: 'https://betaworks.example.com',
        created_at: '2026-05-15T08:00:00Z',
        updated_at: '2026-05-15T08:00:00Z',
    },
];
