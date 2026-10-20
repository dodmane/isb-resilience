import { getLLMRuntimeSettings } from './settings';

export function isLLMConfigured(): boolean {
  return Boolean(getLLMRuntimeSettings().apiKey);
}

export function getScoringModel(): string {
  return getLLMRuntimeSettings().model;
}

function redactDiagnostic(value: string, secret: string): string {
  return value
    .replaceAll(secret, '[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
}

function requestDiagnostics(requestUrl: string, model: string, message: string, secret: string): string {
  const safeMessage = redactDiagnostic(message, secret);
  const curl = [
    `curl --request POST ${JSON.stringify(requestUrl)} \\`,
    `  --header 'content-type: application/json' \\`,
    `  --header "x-api-key: $ANTHROPIC_API_KEY" \\`,
    `  --header 'anthropic-version: 2023-06-01' \\`,
    `  --data '{"model":${JSON.stringify(model)},"max_tokens":64,"messages":[{"role":"user","content":"Replace with a safe test prompt."}]}'`,
  ].join('\n');
  return `${safeMessage}\nRequest URL: ${requestUrl}\nModel: ${model}\nDiagnostic cURL (credential omitted; uses $ANTHROPIC_API_KEY):\n${curl}`;
}

async function providerError(response: Response, secret: string): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `LLM API error: ${response.status}`;
  try {
    const body = JSON.parse(text) as { error?: { message?: string; type?: string } };
    const detail = body.error?.message || body.error?.type;
    return redactDiagnostic(detail || `LLM API error: ${response.status}`, secret);
  } catch {
    return redactDiagnostic(text, secret).slice(0, 1000) || `LLM API error: ${response.status}`;
  }
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = getLLMRuntimeSettings();
  if (!settings.apiKey) {
    throw new Error('LLM not configured — enter an API key in LLM settings or set ANTHROPIC_API_KEY');
  }
  const requestUrl = `${settings.baseUrl.replace(/\/+$/, '')}/v1/messages`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
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
  } catch (err) {
    const failure = err instanceof Error ? err : new Error('Unknown network error');
    const causeCode = (failure as Error & { cause?: { code?: string } }).cause?.code;
    const message = requestDiagnostics(
      requestUrl,
      settings.model,
      `LLM request failed${causeCode ? ` (${causeCode})` : ''}: ${failure.message}`,
      settings.apiKey
    );
    console.error(message);
    throw new Error(message);
  }

  if (!response.ok) {
    const detail = await providerError(response, settings.apiKey);
    const message = requestDiagnostics(requestUrl, settings.model, detail, settings.apiKey);
    console.error(message);
    throw new Error(message);
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
