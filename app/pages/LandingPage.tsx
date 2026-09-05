import { useState } from 'react';
import { SEO } from '../lib/seo';
import Sentry from '../lib/sentry';

export default function LandingPage() {
  const [name, setName] = useState('');

  const handleStartAnalysis = () => {
    Sentry.captureEvent({
      message: 'Landing page: Start Analysis clicked',
      level: 'info',
      extra: { name },
    });
  };

  return (
    <div className="container mx-auto p-4">
      <SEO
        title="AI Resume Analyzer | Smart Resume Analysis & Job Matching"
        description="Upload your resume to get personalized analysis and job matching."
        image="/og-image.png"
      />
      <h1 className="text-3xl font-bold mb-4">Welcome to AI Resume Analyzer</h1>
      <p className="mb-6">Upload your resume to get personalized analysis and job matching.</p>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="border p-2 rounded"
        />
      </div>
      <button 
        aria-label="Start Resume Analysis" 
        onClick={handleStartAnalysis}
        className="bg-blue-500 text-white px-4 py-2 rounded">
        Start Analyzing
      </button>
    </div>
  );
}