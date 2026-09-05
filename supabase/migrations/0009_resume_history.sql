-- 0009_resume_history.sql
-- Add support for multiple versions of a resume with diff tracking

-- Create a table for resume versions
CREATE TABLE resume_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    job_title TEXT,
    company_name TEXT,
    job_description TEXT,
    image_path TEXT,
    resume_path TEXT,
    feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resume_id, version_number)
);

-- Create an index for faster lookups by resume_id
CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);

-- Create a function to automatically increment version numbers
CREATE OR REPLACE FUNCTION increment_resume_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM resume_versions
    WHERE resume_id = NEW.resume_id;
    
    NEW.version_number := next_version;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the resume_versions table
CREATE TRIGGER trigger_increment_resume_version
    BEFORE INSERT ON resume_versions
    FOR EACH ROW
    EXECUTE FUNCTION increment_resume_version();

-- Add a column to track the current version of a resume
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES resume_versions(id);

-- Add RLS policies for the new table
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own resume versions
DROP POLICY IF EXISTS "resume_versions_select_own" ON resume_versions;
CREATE POLICY "resume_versions_select_own"
    ON resume_versions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM resumes r
            WHERE r.id = resume_versions.resume_id
            AND r.user_id = auth.uid()
        )
    );

-- Policy: users can only insert their own resume versions
DROP POLICY IF EXISTS "resume_versions_insert_own" ON resume_versions;
CREATE POLICY "resume_versions_insert_own"
    ON resume_versions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM resumes r
            WHERE r.id = resume_versions.resume_id
            AND r.user_id = auth.uid()
        )
    );

-- Policy: users can only update their own resume versions (limited to current version)
DROP POLICY IF EXISTS "resume_versions_update_own" ON resume_versions;
CREATE POLICY "resume_versions_update_own"
    ON resume_versions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM resumes r
            WHERE r.id = resume_versions.resume_id
            AND r.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM resumes r
            WHERE r.id = resume_versions.resume_id
            AND r.user_id = auth.uid()
            AND r.current_version_id = resume_versions.id
        )
    );

-- Policy: users can only delete their own resume versions
DROP POLICY IF EXISTS "resume_versions_delete_own" ON resume_versions;
CREATE POLICY "resume_versions_delete_own"
    ON resume_versions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM resumes r
            WHERE r.id = resume_versions.resume_id
            AND r.user_id = auth.uid()
        )
    );