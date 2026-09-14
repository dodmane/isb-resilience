const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export function isLLMConfigured(): boolean {
  return !!ANTHROPIC_API_KEY;
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('LLM API key is not configured (ANTHROPIC_API_KEY is missing). Enable "Use Mock Data" in settings if you wish to run without an LLM key.');
  }

  const response = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM API error:', response.status, errText);
    throw new Error(`LLM API error (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  if (!content) {
    throw new Error('LLM API returned an empty response.');
  }
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
