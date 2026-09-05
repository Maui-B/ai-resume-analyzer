'use client';

import { useState, useEffect } from 'react';
import { getResumes, archiveResume, unarchiveResume, deleteResume, addResumeTag, removeResumeTag } from '@/lib/resume.library.service';
import { Resume } from '@/lib/resume.library.service';

export default function ResumeLibrary() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumes();
  }, [search, selectedTags, showArchived]);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const userResumes = await getResumes('user-id', {
        search,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        archived: showArchived
      });
      setResumes(userResumes);

      // Extract unique tags
      const allTags = Array.from(new Set(
        userResumes.flatMap(r => r.tags)
      ));
      setTags(allTags);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (resumeId: string) => {
    await archiveResume(resumeId);
    fetchResumes();
  };

  const handleUnarchive = async (resumeId: string) => {
    await unarchiveResume(resumeId);
    fetchResumes();
  };

  const handleDelete = async (resumeId: string) => {
    if (window.confirm('Are you sure you want to delete this resume? This cannot be undone.')) {
      await deleteResume(resumeId);
      fetchResumes();
    }
  };

  const handleAddTag = async (resumeId: string, tag: string) => {
    await addResumeTag(resumeId, tag);
    fetchResumes();
  };

  const handleRemoveTag = async (resumeId: string, tag: string) => {
    await removeResumeTag(resumeId, tag);
    fetchResumes();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) return <div className="p-4">Loading resumes...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Resume Library</h1>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full border p-2 rounded"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded ${showArchived ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* Tags filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumes list */}
      {resumes.length === 0 ? (
        <p className="text-gray-500">No resumes found.</p>
      ) : (
        <div className="space-y-4">
          {resumes.map(resume => (
            <div key={resume.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{resume.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(resume.updated_at).toLocaleDateString()}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {resume.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(resume.id, tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {resume.archived ? (
                    <button
                      onClick={() => handleUnarchive(resume.id)}
                      className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Unarchive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(resume.id)}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Archive
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}