import { getLLMRuntimeSettings, LLM_PROVIDER } from './settings';

export function isLLMConfigured(): boolean {
  return Boolean(getLLMRuntimeSettings().apiKey);
}

export function getScoringModel(): string {
  return getLLMRuntimeSettings().model;
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = getLLMRuntimeSettings();
  if (!settings.apiKey) {
    throw new Error('LLM not configured — enter an API key in LLM settings or set ANTHROPIC_API_KEY');
  }
  if (settings.provider !== LLM_PROVIDER) throw new Error(`Unsupported LLM provider: ${settings.provider}`);

  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('LLM API error:', response.status, err);
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  return content;
}

export async function callLLMJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const raw = await callLLM(
    systemPrompt + '\n\nRespond ONLY with valid JSON. No markdown, no explanation, no code fences.',
    userPrompt
  );

  // Strip any markdown code fences the model may add despite instructions
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}
