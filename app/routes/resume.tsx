import type { Route } from './+types/resume';
import { Link, redirect, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';
import { useAuthStore } from '~/lib/auth';
import { getResume, getResumeVersions } from '~/lib/services/resumes';
import type { ResumeVersion } from '~/lib/services/resumes';

export const meta = () => [
  { title: 'Resumind | Review' },
  { name: 'description', content: 'Detailed overview of your resume.' },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect(`/auth?next=/resume/${params.id}`);
  if (user.role !== 'jobseeker') throw redirect('/dashboard');
  const resume = await getResume(params.id);
  const versions = await getResumeVersions(params.id);
  return { resume, versions };
}

export default function Resume({ loaderData }: Route.ComponentProps) {
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(
    (loaderData?.resume?.feedback as Feedback) ?? null,
  );
  const [versions, setVersions] = useState<ResumeVersion[]>(loaderData?.versions ?? []);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const resume = loaderData?.resume;
    const versionData = loaderData?.versions ?? [];
    
    if (!resume) return;
    setVersions(versionData);
    
    // Set initial state to the first version (latest)
    if (versionData.length > 0) {
      const latestVersion = versionData[0];
      setSelectedVersion(latestVersion);
      setFeedback(latestVersion.feedback);
      
      if (latestVersion.imagePath) {
        setImageUrl(latestVersion.imagePath);
        setResumeUrl(latestVersion.resumePath || latestVersion.imagePath);
      }
    } else {
      // Fallback to original resume data if no versions exist
      setFeedback(resume.feedback as Feedback);
      if (resume.imagePath) {
        setImageUrl(resume.imagePath);
        setResumeUrl(resume.resumePath || resume.imagePath);
      }
    }
  }, [loaderData]);

  // Revoke object URLs when they change or on unmount (defensive — we set
  // plain URLs above, but if Stage 2 starts using blob: URLs we want them
  // cleaned up).
  useEffect(() => {
    return () => {
      if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
      if (resumeUrl.startsWith('blob:')) URL.revokeObjectURL(resumeUrl);
    };
  }, [imageUrl, resumeUrl]);

  const handleVersionChange = (version: ResumeVersion) => {
    setSelectedVersion(version);
    setFeedback(version.feedback);
    setImageUrl(version.imagePath);
    setResumeUrl(version.resumePath);
  };

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  alt={`Resume ${id}`}
                />
              </a>
            </div>
          )}
          {versions.length > 1 && (
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showHistory ? 'Hide History' : `Show History (${versions.length} versions)`}
              </button>
            </div>
          )}
        </section>
        <section className="feedback-section">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
            {selectedVersion && versions.length > 1 && (
              <div className="text-sm text-dark-200">
                Version {selectedVersion.versionNumber} • {new Date(selectedVersion.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {showHistory && versions.length > 1 && (
            <div className="mb-8 bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-2">Version History</h3>
              <div className="flex flex-wrap gap-2">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleVersionChange(version)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedVersion?.id === version.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    V{version.versionNumber}
                    {version.id === versions[0].id && ' (Latest)'}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS score={feedback.ATS?.score || 0} suggestions={feedback.ATS?.tips || []} />
              <Details feedback={feedback} />
            </div>
          ) : (
            <img src="/images/resume-scan-2.gif" className="w-full" alt="loading" />
          )}
        </section>
      </div>
    </main>
  );
}
