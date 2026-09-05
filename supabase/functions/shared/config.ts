// supabase/functions/shared/config.ts
// AI Provider configuration. Set these as Supabase secrets:
//   AI_PROVIDER (anthropic|openai|gemini|grok|qwen|openrouter|openai-compatible)
//   AI_API_KEY (not needed for openai-compatible)
//   AI_BASE_URL (required for openai-compatible, e.g., http://host.docker.internal:11434)
//   AI_MODEL (model slug, e.g., claude-3-5-sonnet-20240620, gpt-4o, gemini-1.5-pro, llama3.1)
//   AI_MAX_TOKENS (optional, default 4000)
//   AI_TEMPERATURE (optional, default 0)

import type { Provider, AIProviderConfig } from './ai-provider.ts';

export function getAIConfig(): AIProviderConfig {
  const provider = Deno.env.get('AI_PROVIDER') as Provider | undefined ?? 'anthropic';
  
  const config: AIProviderConfig = {
    provider,
    model: Deno.env.get('AI_MODEL') ?? getDefaultModel(provider),
    maxTokens: parseInt(Deno.env.get('AI_MAX_TOKENS') ?? '4000'),
    temperature: parseFloat(Deno.env.get('AI_TEMPERATURE') ?? '0'),
  };

  if (provider !== 'openai-compatible') {
    config.apiKey = Deno.env.get('AI_API_KEY');
    if (!config.apiKey) {
      throw new Error(`AI_API_KEY is required for provider "${provider}"`);
    }
  } else {
    config.baseUrl = Deno.env.get('AI_BASE_URL');
    if (!config.baseUrl) {
      console.warn('AI_BASE_URL not set, using Ollama default: http://host.docker.internal:11434');
      config.baseUrl = 'http://host.docker.internal:11434';
    }
    const apiKey = Deno.env.get('AI_API_KEY');
    if (apiKey) config.apiKey = apiKey;
  }

  return config;
}

function getDefaultModel(provider: Provider): string {
  switch (provider) {
    case 'anthropic': return 'claude-3-5-sonnet-20240620';
    case 'openai': return 'gpt-4o';
    case 'gemini': return 'gemini-1.5-pro';
    case 'grok': return 'grok-2-1212';
    case 'qwen': return 'qwen-max';
    case 'openrouter': return 'anthropic/claude-3.5-sonnet';
    case 'openai-compatible': return 'llama3.1';
    default: return 'claude-3-5-sonnet-20240620';
  }
}