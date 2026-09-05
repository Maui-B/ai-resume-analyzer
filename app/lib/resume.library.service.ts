import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  archived: boolean;
}

export async function getResumes(userId: string, filters: {
  search?: string;
  tags?: string[];
  archived?: boolean;
} = {}): Promise<Resume[]> {
  let query = supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId);

  if (filters.archived !== undefined) {
    query = query.eq('archived', filters.archived);
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addResumeTag(resumeId: string, tag: string): Promise<void> {
  const { data, error } = await supabase
    .from('resumes')
    .update({
      tags: supabase.functions().call('array_append', { array: 'tags', value: tag })
    })
    .eq('id', resumeId);

  if (error) throw error;
}

export async function removeResumeTag(resumeId: string, tag: string): Promise<void> {
  const { data, error } = await supabase
    .from('resumes')
    .update({
      tags: supabase.functions().call('array_remove', { array: 'tags', value: tag })
    })
    .eq('id', resumeId);

  if (error) throw error;
}

export async function archiveResume(resumeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('resumes')
    .update({ archived: true })
    .eq('id', resumeId);

  if (error) throw error;
}

export async function unarchiveResume(resumeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('resumes')
    .update({ archived: false })
    .eq('id', resumeId);

  if (error) throw error;
}

export async function deleteResume(resumeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId);

  if (error) throw error;
}