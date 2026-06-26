import type { Route } from './+types/resume';
import { Link, redirect, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';
import { useAuthStore } from '~/lib/auth';
import { getResume } from '~/lib/services/resumes';

export const meta = () => [
  { title: 'Resumind | Review' },
  { name: 'description', content: 'Detailed overview of your resume.' },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect(`/auth?next=/resume/${params.id}`);
  if (user.role !== 'jobseeker') throw redirect('/dashboard');
  const resume = await getResume(params.id);
  return { resume };
}

export default function Resume({ loaderData }: Route.ComponentProps) {
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(
    (loaderData?.resume?.feedback as Feedback) ?? null,
  );

  useEffect(() => {
    const resume = loaderData?.resume;
    if (!resume) return;
    setFeedback(resume.feedback as Feedback);
    // imagePath / resumePath may be data URIs (demo), public URLs, or storage paths.
    // For now we treat anything starting with "/" as a public path on this app.
    if (resume.imagePath) {
      setImageUrl(resume.imagePath);
      setResumeUrl(resume.resumePath || resume.imagePath);
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
        </section>
        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
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
