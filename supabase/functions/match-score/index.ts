import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Rate limiting configuration
const RATE_LIMIT = 10; // Max 10 calls per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

interface MatchFeedback {
  matchScore: number;
  missingSkills: string[];
  topStrengths: string[];
  concerns: string[];
  suggestions: string[];
}

interface RequestBody {
  jobId: string;
  resumeId: string;
}

// Simple in-memory rate limiting (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit) {
    // First request for this user
    rateLimitStore.set(userId, { count: 1, timestamp: now });
    return { allowed: true };
  }
  
  // Check if the window has expired
  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    // Reset the window
    rateLimitStore.set(userId, { count: 1, timestamp: now });
    return { allowed: true };
  }
  
  // Check if user is within limit
  if (userLimit.count < RATE_LIMIT) {
    // Increment count
    rateLimitStore.set(userId, { count: userLimit.count + 1, timestamp: userLimit.timestamp });
    return { allowed: true };
  }
  
  // User has exceeded the rate limit
  const resetTime = userLimit.timestamp + RATE_LIMIT_WINDOW;
  return { allowed: false, resetTime };
}

export default async (req: Request) => {
  // Create a Supabase client
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { jobId, resumeId } = body;

    if (!jobId || !resumeId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from authorization header for rate limiting
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user ID
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString()
        },
      });
    }

    // Get job details from the database
    const { data: jobData, error: jobError } = await supabaseClient
      .from('jobs')
      .select('title, description, skills')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Job fetch error:', jobError);
      return new Response(JSON.stringify({ error: 'Could not retrieve job details' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get resume details from the database
    const { data: resumeData, error: resumeError } = await supabaseClient
      .from('resumes')
      .select('user_id, resume_path, feedback')
      .eq('id', resumeId)
      .single();

    if (resumeError || !resumeData) {
      console.error('Resume fetch error:', resumeError);
      return new Response(JSON.stringify({ error: 'Could not retrieve resume details' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the resume file from storage
    const { data: fileData, error: fileError } = await supabaseClient
      .storage
      .from('resumes')
      .download(resumeData.resume_path);

    if (fileError) {
      console.error('Storage error:', fileError);
      return new Response(JSON.stringify({ error: 'Could not retrieve resume file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert the file to base64 for the API call
    const uint8Array = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(uint8Array)));

    // Prepare the prompt for the AI
    const prompt = `You are an expert in matching candidates to job requirements.
      Analyze how well this resume matches the job posting.
      Calculate a match score from 0 to 100 based on skills, experience, and qualifications.
      The job posting is titled: "${jobData.title}"
      Description: ${jobData.description}
      Required skills: ${jobData.skills.join(', ')}
      Provide the following in JSON format:
      {
        "matchScore": number,
        "missingSkills": string[],
        "topStrengths": string[],
        "concerns": string[],
        "suggestions": string[]
      }`;

    // Call the Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text();
      console.error('Anthropic API error:', errorData);
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const anthropicData = await anthropicResponse.json();
    const aiResponse = anthropicData.content[0].text;

    // Extract the JSON from the response (in case it includes extra text)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let matchFeedback: MatchFeedback;
    try {
      matchFeedback = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the match feedback
    return new Response(JSON.stringify({ matchFeedback }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};