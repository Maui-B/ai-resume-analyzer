import type { Route } from './+types/dashboard.jobs.new';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createJob } from '~/lib/services/jobs';
import { useAuthStore } from '~/lib/auth';
import { usePuterStore } from '~/lib/puter';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function NewJob() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [skills, setSkills] = useState('');
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { isLoading: isPuterLoading } = usePuterStore();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const skillsList = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const job = await createJob({
        title,
        description,
        location: location || undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        skills: skillsList,
      });
      navigate(`/dashboard/jobs`);
      // `job` would be used in a future "view job" link.
      void job;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const generateSkills = async () => {
    if (!description.trim() || !user) return;
    
    setGenerating(true);
    try {
      // In Stage 2, we'll replace this with a proper Edge Function call
      // For now, we'll simulate the behavior
      const mockSuggestions = [
        'React', 'TypeScript', 'Supabase', 'Tailwind CSS', 
        'Node.js', 'PostgreSQL', 'AWS', 'Docker'
      ];
      setSuggestedSkills(mockSuggestions);
    } catch (err) {
      setError('Failed to generate skills');
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (!skills.includes(suggestion)) {
      setSkills(skills ? `${skills}, ${suggestion}` : suggestion);
    }
  };

  return (
    <div className="max-w-[760px] flex flex-col gap-6">
      <h1 className="!text-3xl">Post a new job</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
            {error}
          </div>
        )}
        <div className="form-div">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-div">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-div">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Remote (SA) / Cape Town / etc."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-div">
            <label htmlFor="salaryMin">Salary min (ZAR)</label>
            <input
              id="salaryMin"
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
          </div>
          <div className="form-div">
            <label htmlFor="salaryMax">Salary max (ZAR)</label>
            <input
              id="salaryMax"
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
          </div>
        </div>
        
        {/* AI Skills Suggestion Section */}
        <div className="form-div">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="skills">Skills (comma separated)</label>
            <button
              type="button"
              onClick={generateSkills}
              disabled={generating || isPuterLoading || !description.trim()}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Suggest skills'}
            </button>
          </div>
          <input
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, TypeScript, Supabase"
          />
          
          {/* Suggested skills */}
          {suggestedSkills.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-dark-200 mb-2">Suggested skills:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedSkills.map((skill, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestion(skill)}
                    className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-full"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Publishing…' : 'Publish job'}
        </button>
      </form>
    </div>
  );
}
