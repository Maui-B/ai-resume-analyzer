import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('pages/LandingPage.tsx'),
  route('/auth', 'routes/auth.tsx'),
  route('/onboarding', 'routes/onboarding.tsx'),
  route('/settings', 'routes/settings.tsx'),

  // Jobseeker
  route('/upload', 'routes/upload.tsx'),
  route('/resume/:id', 'routes/resume.tsx'),

  // Public job board
  route('/jobs', 'routes/jobs.tsx'),
  route('/jobs/:id', 'routes/jobs.$id.tsx'),

  // Recruiter / company dashboard
  route('/dashboard', 'routes/dashboard.tsx', [
    index('routes/dashboard._index.tsx'),
    route('jobs', 'routes/dashboard.jobs.tsx'),
    route('jobs/new', 'routes/dashboard.jobs.new.tsx'),
    route('applications', 'routes/dashboard.applications.tsx'),
    route('resume-library', 'routes/dashboard.resume-library.tsx'),
    route('team', 'routes/dashboard.team.tsx'),
    route('reports', 'routes/dashboard.reports.tsx'),
  ]),
] satisfies RouteConfig;

