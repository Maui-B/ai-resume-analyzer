import type { Route } from './+types/jobs';
import { Link, useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import Navbar from '~/components/Navbar';
import { listJobs } from '~/lib/services/jobs';

export const meta = () => [
  { title: 'Resumind | Jobs' },
  { name: 'description', content: 'Browse open roles.' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const jobs = await listJobs({ status: 'open' });
  return { jobs };
}

export default function Jobs({ loaderData }: Route.ComponentProps) {
  const [jobs, setJobs] = useState<JobRow[]>(loaderData?.jobs ?? []);
  const [filteredJobs, setFilteredJobs] = useState<JobRow[]>(loaderData?.jobs ?? []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [skillFilter, setSkillFilter] = useState(searchParams.get('skill') || '');

  useEffect(() => {
    if (loaderData) setJobs(loaderData.jobs);
  }, [loaderData]);

  useEffect(() => {
    // Apply filters
    let result = [...jobs];
    
    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(job => 
        job.title.toLowerCase().includes(term) ||
        job.description?.toLowerCase().includes(term) ||
        job.skills.some(skill => skill.toLowerCase().includes(term))
      );
    }
    
    // Location filter
    if (locationFilter) {
      result = result.filter(job => 
        job.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    // Skill filter
    if (skillFilter) {
      result = result.filter(job => 
        job.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
      );
    }
    
    setFilteredJobs(result);
  }, [jobs, searchTerm, locationFilter, skillFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      search: searchTerm,
      location: locationFilter,
      skill: skillFilter
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setSkillFilter('');
    setSearchParams({});
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (min && max) return `R${min.toLocaleString()} – R${max.toLocaleString()}`;
    if (min) return `From R${min.toLocaleString()}`;
    if (max) return `Up to R${max.toLocaleString()}`;
    return null;
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Open Roles</h1>
          <h2>Browse positions that match your skills</h2>
        </div>
        
        {/* Search and Filters */}
        <form onSubmit={handleSearch} className="w-full max-w-[1000px] mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-dark-200 mb-1">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Job title, skills, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-dark-200 mb-1">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  placeholder="City, Remote..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="skill" className="block text-sm font-medium text-dark-200 mb-1">
                  Skill
                </label>
                <input
                  id="skill"
                  type="text"
                  placeholder="React, Node, etc."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-dark-200 hover:text-dark-400"
              >
                Clear filters
              </button>
              <button
                type="submit"
                className="primary-button text-sm"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>
        
        {/* Results */}
        {filteredJobs.length === 0 ? (
          <div className="w-full max-w-[1000px] text-center py-12">
            <p className="text-dark-200">No jobs match your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="w-full max-w-[1000px] flex flex-col gap-4">
            <div className="text-sm text-dark-200 mb-2">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </div>
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <h2 className="!text-black font-semibold">{job.title}</h2>
                    {job.status === 'closed' && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Closed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-dark-200 text-sm mt-1">
                    {job.location ?? 'Location TBD'}
                  </p>
                  
                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-gray-100 text-dark-200 px-2 py-1 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {job.description && (
                    <p className="text-sm text-dark-200 mt-3 line-clamp-2">
                      {job.description.substring(0, 150)}...
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {formatSalary(job.salary_min, job.salary_max) && (
                    <p className="font-semibold text-dark-200">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </p>
                  )}
                  <span className="text-sm text-blue-600">View details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
