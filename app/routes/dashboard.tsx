import type { Route } from './+types/dashboard';
import { Link, Outlet, redirect } from 'react-router';
import Navbar from '~/components/Navbar';
import { useAuthStore } from '~/lib/auth';

export const meta = () => [
  { title: 'Resumind | Dashboard' },
  { name: 'description', content: 'Recruiter dashboard.' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect('/auth?next=/dashboard');
  if (user.role !== 'recruiter' && user.role !== 'company_admin') {
    throw redirect('/');
  }
  return null;
}

export default function DashboardLayout() {
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section items-start">
        <div className="w-full max-w-[1200px]">
          <nav className="flex gap-4 border-b border-gray-200 pb-3 mb-6">
            <Link to="/dashboard" className="text-dark-200 hover:text-black">
              Overview
            </Link>
            <Link to="/dashboard/jobs" className="text-dark-200 hover:text-black">
              Jobs
            </Link>
            <Link to="/dashboard/applications" className="text-dark-200 hover:text-black">
              Applications
            </Link>
          </nav>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
