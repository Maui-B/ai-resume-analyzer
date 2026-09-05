-- 0010_resume_functions.sql
-- Database functions for resume versioning

-- Function to create a new version of a resume
CREATE OR REPLACE FUNCTION create_resume_version(
    resume_id_input UUID,
    feedback_input JSONB
)
RETURNS UUID
LANGUAGE PLPGSQL
AS $$
DECLARE
    new_version_id UUID;
    resume_record RECORD;
BEGIN
    -- Get the current resume record
    SELECT * INTO resume_record FROM resumes WHERE id = resume_id_input;
    
    -- Check if the resume exists and belongs to the current user
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Resume not found';
    END IF;
    
    -- Check RLS policies are satisfied by attempting a select
    PERFORM * FROM resumes WHERE id = resume_id_input AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own resumes';
    END IF;
    
    -- Create a new version record
    INSERT INTO resume_versions (
        resume_id,
        job_title,
        company_name,
        job_description,
        image_path,
        resume_path,
        feedback
    ) VALUES (
        resume_id_input,
        resume_record.job_title,
        resume_record.company_name,
        resume_record.job_description,
        resume_record.image_path,
        resume_record.resume_path,
        feedback_input
    ) RETURNING id INTO new_version_id;
    
    -- Update the current_version_id in the main resumes table
    UPDATE resumes 
    SET current_version_id = new_version_id
    WHERE id = resume_id_input;
    
    RETURN new_version_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_resume_version(UUID, JSONB) TO authenticated;