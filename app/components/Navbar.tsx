// app/components/Navbar.tsx
// Role-aware navbar. Shows different links per role.

import { Link } from 'react-router';
import { useAuthStore } from '~/lib/auth';

export default function Navbar() {
    const { user, isAuthenticated, signOut } = useAuthStore();

    return (
        <nav className="navbar">
            <Link to={user?.role === 'recruiter' || user?.role === 'company_admin' ? '/dashboard' : '/'}>
                <p className="text-2xl font-bold text-gradient">RESUMIND</p>
            </Link>
            <div className="flex items-center gap-3">
                {isAuthenticated ? (
                    <>
                        {user?.role === 'jobseeker' && (
                            <Link to="/upload" className="primary-button w-fit">
                                Upload Resume
                            </Link>
                        )}
                        {(user?.role === 'recruiter' || user?.role === 'company_admin') && (
                            <>
                                <Link
                                    to="/dashboard/jobs/new"
                                    className="primary-button w-fit"
                                >
                                    Post a Job
                                </Link>
                                <Link to="/dashboard/applications" className="text-dark-200 hover:underline">
                                    Applications
                                </Link>
                            </>
                        )}
                        <Link to="/settings" className="text-dark-200 hover:underline">
                            {user?.fullName ?? user?.email ?? 'Account'}
                        </Link>
                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="text-sm text-dark-200 hover:underline"
                        >
                            Sign out
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/jobs" className="text-dark-200 hover:underline">
                            Browse Jobs
                        </Link>
                        <Link to="/auth" className="primary-button w-fit">
                            Sign in
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
