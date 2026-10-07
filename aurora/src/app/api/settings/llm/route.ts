import { NextRequest, NextResponse } from 'next/server';
import { clearLLMSettings, getLLMSettingsSummary, LLM_PROVIDER, saveLLMSettings } from '@/lib/llm/settings';

export async function GET() {
  return NextResponse.json(getLLMSettingsSummary());
}

export async function PUT(request: NextRequest) {
  let body: { apiKey?: unknown; clearApiKey?: unknown; model?: unknown; provider?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Settings must be valid JSON.' }, { status: 400 });
  }

  if (body.apiKey !== undefined && (typeof body.apiKey !== 'string' || body.apiKey.length > 4096)) {
    return NextResponse.json({ error: 'API key must be a string shorter than 4096 characters.' }, { status: 400 });
  }
  if (typeof body.model !== 'string' || !body.model.trim() || body.model.trim().length > 160 || /[\r\n]/.test(body.model)) {
    return NextResponse.json({ error: 'Enter a valid model name.' }, { status: 400 });
  }
  if (body.provider !== LLM_PROVIDER) {
    return NextResponse.json({ error: `Unsupported provider. Choose ${LLM_PROVIDER}.` }, { status: 400 });
  }
  if (body.clearApiKey !== undefined && typeof body.clearApiKey !== 'boolean') {
    return NextResponse.json({ error: 'clearApiKey must be a boolean.' }, { status: 400 });
  }

  const settings = saveLLMSettings({
    apiKey: body.apiKey as string | undefined,
    clearApiKey: body.clearApiKey as boolean | undefined,
    model: body.model,
    provider: body.provider,
  });
  return NextResponse.json(settings);
}

export async function DELETE() {
  return NextResponse.json(clearLLMSettings());
}
