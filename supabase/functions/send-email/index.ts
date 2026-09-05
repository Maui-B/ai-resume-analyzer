// supabase/functions/send-email/index.ts
// Brevo (formerly Sendinblue) email service
// Required secrets:
//   BREVO_API_KEY — Brevo v3 API key
//   FROM_EMAIL — sender email (verified in Brevo)
//   FROM_NAME — sender display name

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface EmailRequest {
  to: string;
  subject: string;
  template: 'application_submitted' | 'application_reviewed' | 'application_shortlisted' | 'application_interviewing' | 'application_rejected' | 'application_hired';
  variables: Record<string, string>;
}

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@airesumeanalyzer.com';
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'AI Resume Analyzer';

if (!BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY is required');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as EmailRequest;
    const { to, subject, template, variables } = body;

    if (!to || !subject || !template || !variables) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const htmlContent = getEmailTemplate(template, variables);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to send email', details: error }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getEmailTemplate(template: string, vars: Record<string, string>): string {
  const templates: Record<string, (v: Record<string, string>) => string> = {
    application_submitted: (v) => `
      <h2>Application Submitted</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>Your application for <strong>${v.job_title}</strong> has been submitted successfully.</p>
      <p>We'll keep you updated on the status of your application.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
    application_reviewed: (v) => `
      <h2>Application Under Review</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>The hiring team is currently reviewing your application for <strong>${v.job_title}</strong>.</p>
      <p>We appreciate your patience and will update you soon.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
    application_shortlisted: (v) => `
      <h2>Good News!</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>Your application for <strong>${v.job_title}</strong> has been shortlisted!</p>
      <p>The hiring team is reviewing your profile and will be in touch soon.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
    application_interviewing: (v) => `
      <h2>Interview Invitation</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>We'd like to invite you for an interview for the <strong>${v.job_title}</strong> position.</p>
      <p>The hiring team will contact you shortly with interview details.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
    application_rejected: (v) => `
      <h2>Application Update</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>Thank you for applying to <strong>${v.job_title}</strong>.</p>
      <p>After careful review, we've decided to move forward with other candidates whose profiles more closely match our current needs.</p>
      <p>We encourage you to apply for future openings that match your skills.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
    application_hired: (v) => `
      <h2>Congratulations!</h2>
      <p>Hi ${v.candidate_name},</p>
      <p>We're thrilled to inform you that your application for <strong>${v.job_title}</strong> has been accepted!</p>
      <p>The hiring team will contact you shortly with next steps.</p>
      <p>Best regards,<br/>AI Resume Analyzer Team</p>
    `,
  };

  const renderer = templates[template];
  if (!renderer) {
    return `<p>Unknown email template: ${template}</p>`;
  }
  return renderer(vars);
}