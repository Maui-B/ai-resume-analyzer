// app/components/DemoModeBanner.tsx
// Renders a yellow banner when the app is in demo mode (using bundled mocks).

import { isDemoMode } from '~/lib/demo-mode';

export default function DemoModeBanner() {
    if (!isDemoMode()) return null;
    return (
        <div
            role="status"
            className="w-full bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm text-center py-2 px-4"
        >
            <strong>Demo mode</strong> &mdash; using bundled sample data. No writes are
            persisted. Set <code className="bg-yellow-200 px-1 rounded">VITE_DEMO_MODE=false</code>{' '}
            and configure Supabase to use real data.
        </div>
    );
}
