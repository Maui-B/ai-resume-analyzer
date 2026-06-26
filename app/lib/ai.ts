// app/lib/ai.ts
// AI wrapper. Stage 0/1: routed through Puter (legacy).
// Stage 2: routed through Supabase Edge Function 'ai-feedback'.

import { env } from './env';
import { prepareInstructions } from '../../constants';
import { usePuterStore } from './puter';

interface AIResult {
    feedback: Feedback;
}

/** Analyse a resume against a job description. Returns the structured feedback. */
export async function analyzeResume(input: {
    resumePath: string;
    jobTitle: string;
    jobDescription: string;
}): Promise<AIResult | null> {
    if (env.usePuterAi) {
        const puter = usePuterStore.getState();
        const response = await puter.ai.feedback(
            input.resumePath,
            prepareInstructions({
                jobTitle: input.jobTitle,
                jobDescription: input.jobDescription,
            }),
        );
        if (!response) return null;
        const text =
            typeof response.message.content === 'string'
                ? response.message.content
                : response.message.content[0]?.text;
        if (!text) return null;
        return { feedback: JSON.parse(text) as Feedback };
    }
    // Stage 2 placeholder — Edge Function call goes here.
    throw new Error(
        'AI is unavailable: VITE_USE_PUTER_AI is false and the Edge Function is not yet wired.',
    );
}
