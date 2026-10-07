import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'aurora-llm-settings-'));
const originalEnvironment = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.CLAUDE_MODEL,
  provider: process.env.LLM_PROVIDER,
};

describe('LLM settings overrides', () => {
  let settings: typeof import('@/lib/llm/settings');

  beforeAll(async () => {
    process.chdir(temporaryDirectory);
    settings = await import('@/lib/llm/settings');
  });

  afterAll(() => {
    process.chdir(originalDirectory);
    rmSync(temporaryDirectory, { recursive: true, force: true });
    if (originalEnvironment.apiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalEnvironment.apiKey;
    if (originalEnvironment.model === undefined) delete process.env.CLAUDE_MODEL;
    else process.env.CLAUDE_MODEL = originalEnvironment.model;
    if (originalEnvironment.provider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = originalEnvironment.provider;
  });

  it('saves replacements and clears the saved key while restoring model/provider defaults', () => {
    process.env.ANTHROPIC_API_KEY = 'environment-key';
    process.env.CLAUDE_MODEL = 'environment-model';
    process.env.LLM_PROVIDER = 'anthropic';

    settings.saveLLMSettings({
      apiKey: 'saved-key',
      model: 'replacement-model',
      provider: 'anthropic',
    });
    expect(settings.getLLMRuntimeSettings()).toEqual({
      apiKey: 'saved-key',
      model: 'replacement-model',
      provider: 'anthropic',
    });

    const cleared = settings.clearLLMSettings();
    expect(cleared).toEqual({ model: 'environment-model', provider: 'anthropic', apiKeyConfigured: false });
    expect(settings.getLLMRuntimeSettings().apiKey).toBe('');
  });
});