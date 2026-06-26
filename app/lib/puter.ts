// app/lib/puter.ts
// Puter AI wrapper only. Auth/storage/KV removed in Stage 0 — use Supabase.
// Stage 2 will replace this entirely with a Supabase Edge Function call.

import { create } from 'zustand';

interface PuterAIState {
    isLoading: boolean;
    error: string | null;
    puterReady: boolean;
    ai: {
        feedback: (path: string, message: string) => Promise<AIResponse | undefined>;
        chat: (
            prompt: string | ChatMessage[],
            imageURL?: string | PuterChatOptions,
            testMode?: boolean,
            options?: PuterChatOptions,
        ) => Promise<AIResponse | undefined>;
    };
    init: () => void;
    clearError: () => void;
}

const getPuter = (): typeof window.puter | null =>
    typeof window !== 'undefined' && window.puter ? window.puter : null;

export const usePuterStore = create<PuterAIState>((set, get) => {
    const setError = (msg: string) => set({ error: msg, isLoading: false });

    const feedback = async (path: string, message: string): Promise<AIResponse | undefined> => {
        const puter = getPuter();
        if (!puter) {
            setError('Puter.js not available');
            return undefined;
        }
        set({ isLoading: true, error: null });
        try {
            const response = (await puter.ai.chat(
                [
                    {
                        role: 'user',
                        content: [{ type: 'file', puter_path: path }, { type: 'text', text: message }],
                    },
                ],
                { model: 'claude-3-7-sonnet' },
            )) as AIResponse;
            set({ isLoading: false });
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI feedback failed');
            return undefined;
        }
    };

    const chat = async (
        prompt: string | ChatMessage[],
        imageURL?: string | PuterChatOptions,
        testMode?: boolean,
        options?: PuterChatOptions,
    ): Promise<AIResponse | undefined> => {
        const puter = getPuter();
        if (!puter) {
            setError('Puter.js not available');
            return undefined;
        }
        set({ isLoading: true, error: null });
        try {
            const response = (await puter.ai.chat(prompt, imageURL, testMode, options)) as AIResponse;
            set({ isLoading: false });
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI chat failed');
            return undefined;
        }
    };

    const init = (): void => {
        const puter = getPuter();
        if (puter) {
            set({ puterReady: true });
            return;
        }
        const interval = setInterval(() => {
            if (getPuter()) {
                clearInterval(interval);
                set({ puterReady: true });
            }
        }, 100);
        setTimeout(() => clearInterval(interval), 10000);
    };

    return {
        isLoading: false,
        error: null,
        puterReady: false,
        ai: { feedback, chat },
        init,
        clearError: () => set({ error: null }),
    };
});
