import { createClient } from '@supabase/supabase-js';
import { getAIConfig } from '../shared/config.ts';
import { callAIProvider } from '../shared/ai-provider.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RequestBody {
  resumePath: string;
  jobTitle: string;
  jobDescription: string;
}

export default async (req: Request) => {
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const { resumePath, jobTitle, jobDescription } = body;

    if (!resumePath || !jobTitle || !jobDescription) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get resume file
    const { data: fileData, error: fileError } = await supabaseClient
      .storage.from('resumes').download(resumePath);
    if (fileError) {
      return new Response(JSON.stringify({ error: 'Could not retrieve resume file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uint8Array = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(uint8Array)));

    // Build prompt
    const prompt = `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Please analyze and rate this resume and suggest how to improve it.
      Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
      If there is a lot to improve, don't hesitate to give low scores.
      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      Provide the feedback using the following JSON format:
      {
        "overallScore": number,
        "ATS": {
          "score": number,
          "tips": [{ "type": "good"|"improve", "tip": string }]
        },
        "toneAndStyle": {
          "score": number,
          "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }]
        },
        "content": {
          "score": number,
          "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }]
        },
        "structure": {
          "score": number,
          "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }]
        },
        "skills": {
          "score": number,
          "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }]
        }
      }
      Return the analysis as a JSON object, without any other text and without the backticks.`;

    // Get provider config (supports Anthropic, OpenAI, Gemini, Grok, Qwen, OpenRouter, or local via Ollama/LM Studio/vLLM)
    const aiConfig = getAIConfig();

    // Call the AI provider
    const aiResult = await callAIProvider(aiConfig, [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        ],
      },
    ]);

    const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let feedback;
    try {
      feedback = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ feedback }), {
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