import type { Route } from './+types/upload';
import { type FormEvent, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import FileUploader from '~/components/FileUploader';
import { useAuthStore } from '~/lib/auth';
import { convertPdfToImage } from '~/lib/pdf2img';
import { generateUUID } from '~/lib/utils';
import { analyzeResume } from '~/lib/ai';
import { createResume, updateResumeFeedback } from '~/lib/services/resumes';
import { isDemoMode } from '~/lib/demo-mode';
import { usePuterStore } from '~/lib/puter';

export const meta = () => [
  { title: 'Resumind | Upload' },
  { name: 'description', content: 'Upload a resume and get AI feedback.' },
];

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { user } = useAuthStore.getState();
  if (!user) throw redirect('/auth?next=/upload');
  if (user.role !== 'jobseeker') throw redirect('/dashboard');
  return null;
}

export default function Upload() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const puterReady = usePuterStore((s) => s.puterReady);

  const handleFileSelect = (f: File | null) => setFile(f);

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);

    setStatusText('Converting PDF to image…');
    const imageFile = await convertPdfToImage(file);
    if (!imageFile.file) {
      setStatusText('Error: Failed to convert PDF to image');
      setIsProcessing(false);
      return;
    }

    // In demo mode, we skip storage upload (no Supabase bucket) and
    // store data URIs as fake paths.
    let imagePath = `/local-cache/${generateUUID()}.png`;
    let resumePath = `/local-cache/${generateUUID()}.pdf`;
    if (!isDemoMode()) {
      // Real upload happens here in Stage 2. For now we keep the path shape
      // and store the row.
      // (Stage 2: supabase.storage.from('resumes').upload(...))
    }

    setStatusText('Preparing data…');
    const newResume = await createResume({
      companyName,
      jobTitle,
      jobDescription,
      imagePath,
      resumePath,
    });

    setStatusText('Analysing with AI…');
    const result = await analyzeResume({
      resumePath,
      jobTitle,
      jobDescription,
    });
    if (!result) {
      setStatusText('Error: Failed to analyse resume');
      setIsProcessing(false);
      return;
    }

    setStatusText('Saving feedback…');
    await updateResumeFeedback(newResume.id, result.feedback);
    setStatusText('Analysis complete, redirecting…');
    navigate(`/resume/${newResume.id}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (!form) return;
    const formData = new FormData(form);
    const companyName = formData.get('company-name') as string;
    const jobTitle = formData.get('job-title') as string;
    const jobDescription = formData.get('job-description') as string;
    if (!file) return;
    void handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" alt="processing" />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={!puterReady && !isDemoMode()}
              >
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
