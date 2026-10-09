import { NextRequest, NextResponse } from 'next/server';
import { clearLLMSettings, getLLMSettingsSummary, saveLLMSettings } from '@/lib/llm/settings';

export async function GET() {
  return NextResponse.json(getLLMSettingsSummary());
}

export async function PUT(request: NextRequest) {
  let body: { apiKey?: unknown; clearApiKey?: unknown; baseUrl?: unknown; model?: unknown; provider?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Settings must be valid JSON.' }, { status: 400 });
  }

  if (body.apiKey !== undefined && (typeof body.apiKey !== 'string' || body.apiKey.length > 4096)) {
    return NextResponse.json({ error: 'API key must be a string shorter than 4096 characters.' }, { status: 400 });
  }
  if (typeof body.baseUrl !== 'string' || body.baseUrl.trim().length > 2048) {
    return NextResponse.json({ error: 'Enter a valid HTTP(S) API base URL.' }, { status: 400 });
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(body.baseUrl.trim());
  } catch {
    return NextResponse.json({ error: 'Enter a valid HTTP(S) API base URL.' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    return NextResponse.json({ error: 'Base URL must use HTTP(S) and cannot contain credentials, a query, or a fragment.' }, { status: 400 });
  }
  if (typeof body.model !== 'string' || !body.model.trim() || body.model.trim().length > 160 || /[\r\n]/.test(body.model)) {
    return NextResponse.json({ error: 'Enter a valid model name.' }, { status: 400 });
  }
  if (typeof body.provider !== 'string' || !body.provider.trim() || body.provider.trim().length > 100 || /[\r\n]/.test(body.provider)) {
    return NextResponse.json({ error: 'Enter a valid LLM provider name.' }, { status: 400 });
  }
  if (body.clearApiKey !== undefined && typeof body.clearApiKey !== 'boolean') {
    return NextResponse.json({ error: 'clearApiKey must be a boolean.' }, { status: 400 });
  }

  const settings = saveLLMSettings({
    apiKey: body.apiKey as string | undefined,
    clearApiKey: body.clearApiKey as boolean | undefined,
    baseUrl: body.baseUrl,
    model: body.model,
    provider: body.provider,
  });
  return NextResponse.json(settings);
}

export async function DELETE() {
  return NextResponse.json(clearLLMSettings());
}
