// supabase/functions/shared/ai-provider.ts
// Provider-agnostic AI layer. Supports:
//   - Anthropic (claude-*)
//   - OpenAI (gpt-*, o1-*)
//   - Google Gemini (gemini-*)
//   - xAI / Grok (grok-*)
//   - Qwen / Alibaba (qwen-*)
//   - OpenRouter (aggregator)
//   - OpenAI-compatible local: Ollama, LM Studio, vLLM, LiteLLM, AnythingLLM

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'grok' | 'qwen' | 'openrouter' | 'openai-compatible';

export interface AIProviderConfig {
  provider: Provider;
  apiKey?: string;          // required for cloud providers
  baseUrl?: string;         // required for openai-compatible (local)
  model: string;            // model name / slug
  maxTokens?: number;
  temperature?: number;
}

export interface AIRequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

export interface AIResponse {
  text: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Build the correct payload + headers for each provider, then call it.
 * Returns the raw text response.
 */
export async function callAIProvider(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
): Promise<AIResponse> {
  const { provider, model, maxTokens = 4000, temperature = 0 } = config;

  switch (provider) {
    case 'anthropic':
      return callAnthropic(config, messages, model, maxTokens, temperature);

    case 'openai':
      return callOpenAI(config, messages, model, maxTokens, temperature);

    case 'gemini':
      return callGemini(config, messages, model, maxTokens, temperature);

    case 'grok':
      return callGrok(config, messages, model, maxTokens, temperature);

    case 'qwen':
      return callQwen(config, messages, model, maxTokens, temperature);

    case 'openrouter':
      return callOpenRouter(config, messages, model, maxTokens, temperature);

    case 'openai-compatible':
      return callOpenAICompatible(config, messages, model, maxTokens, temperature);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// ========================= Anthropic =========================

async function callAnthropic(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.content[0].text,
    usage: {
      prompt_tokens: data.usage?.input_tokens,
      completion_tokens: data.usage?.output_tokens,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
}

// ========================= OpenAI =========================

async function callOpenAI(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey!}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : formatOpenAIContent(m.content),
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================= Google Gemini =========================

async function callGemini(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  // Gemini uses a different format — inline data for images
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const contents = messages.map(m => {
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else {
      for (const item of m.content) {
        if (item.type === 'text') {
          parts.push({ text: item.text });
        } else if (item.type === 'image' && item.source) {
          parts.push({
            inlineData: {
              mimeType: item.source.media_type,
              data: item.source.data,
            },
          });
        }
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return {
    text,
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount,
      completion_tokens: data.usageMetadata.candidatesTokenCount,
      total_tokens: data.usageMetadata.totalTokenCount,
    } : undefined,
  };
}

// ========================= xAI / Grok =========================

async function callGrok(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey!}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : formatOpenAIContent(m.content),
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`xAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================= Qwen / Alibaba =========================

async function callQwen(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey!}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : formatOpenAIContent(m.content),
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================= OpenRouter =========================

async function callOpenRouter(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey!}`,
      'HTTP-Referer': 'https://resumind.app',
      'X-Title': 'AI Resume Analyzer',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : formatOpenAIContent(m.content),
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================= OpenAI-Compatible (Local) =========================
// Supports: Ollama, LM Studio, vLLM, LiteLLM, AnythingLLM, Text Generation Inference, etc.

async function callOpenAICompatible(
  config: AIProviderConfig,
  messages: AIRequestMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'; // Ollama default
  const url = `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Local providers often don't need auth keys, but pass it if provided
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : formatOpenAIContent(m.content),
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI-compatible API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================= Helpers =========================

function formatOpenAIContent(content: Array<{ type: string; text?: string; source?: any }>): string {
  // For OpenAI-like APIs, concatenate text parts; drop images for now (they need URL or base64 handling)
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text ?? '')
    .join('\n');
}