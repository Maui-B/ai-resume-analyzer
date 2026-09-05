import { getSupabase } from './supabase';

export type EmailTemplate =
  | 'application_submitted'
  | 'application_reviewed'
  | 'application_shortlisted'
  | 'application_interviewing'
  | 'application_rejected'
  | 'application_hired';

export async function sendStatusEmail(
  to: string,
  subject: string,
  template: EmailTemplate,
  variables: Record<string, string>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, template, variables },
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw error;
  }

  return data;
}