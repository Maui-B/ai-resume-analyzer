import { Link } from 'react-router';
import ScoreCircle from '~/components/ScoreCircle';
import { useEffect, useState } from 'react';

interface Props {
    resume: Resume;
}

export default function ResumeCard({ resume }: Props) {
    const [imageUrl, setImageUrl] = useState(resume.imagePath || '');

    // Keep local state in sync if the parent passes a different imagePath.
    useEffect(() => {
        setImageUrl(resume.imagePath || '');
    }, [resume.imagePath]);

    // Revoke any blob: URL we created when the component unmounts or the URL changes.
    useEffect(() => {
        return () => {
            if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    return (
        <Link to={`/resume/${resume.id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {resume.companyName && (
                        <h2 className="!text-black font-bold break-words">{resume.companyName}</h2>
                    )}
                    {resume.jobTitle && (
                        <h3 className="text-lg break-words text-gray-500">{resume.jobTitle}</h3>
                    )}
                    {!resume.companyName && !resume.jobTitle && (
                        <h2 className="!text-black font-bold">Resume</h2>
                    )}
                </div>
                <div className="flex-shrink-0">
                    <ScoreCircle score={resume.feedback?.overallScore ?? 0} />
                </div>
            </div>
            {imageUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={imageUrl}
                            alt={`Resume for ${resume.companyName ?? 'review'}`}
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                        />
                    </div>
                </div>
            )}
        </Link>
    );
}
