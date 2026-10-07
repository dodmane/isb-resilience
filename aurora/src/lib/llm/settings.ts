import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DATA_DIRECTORY = path.join(process.cwd(), '.aurora-data');
const SETTINGS_PATH = path.join(DATA_DIRECTORY, 'llm-settings.json');
const SUPPORTED_PROVIDER = 'anthropic';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

interface SavedLLMSettings {
  apiKey: string;
  apiKeyOverride: boolean;
  model: string;
  modelOverride?: boolean;
  provider: string;
  providerOverride?: boolean;
}

export interface LLMSettingsInput {
  apiKey?: string;
  clearApiKey?: boolean;
  model: string;
  provider: string;
}

function readSavedSettings(): SavedLLMSettings | null {
  if (!existsSync(SETTINGS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as SavedLLMSettings;
  } catch {
    return null;
  }
}

export function getLLMRuntimeSettings() {
  const saved = readSavedSettings();
  return {
    apiKey: saved?.apiKeyOverride ? saved.apiKey : process.env.ANTHROPIC_API_KEY || '',
    model: saved?.modelOverride === false ? process.env.CLAUDE_MODEL || DEFAULT_MODEL : saved?.model || process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    provider: saved?.providerOverride === false ? process.env.LLM_PROVIDER || SUPPORTED_PROVIDER : saved?.provider || process.env.LLM_PROVIDER || SUPPORTED_PROVIDER,
  };
}

export function getLLMSettingsSummary() {
  const settings = getLLMRuntimeSettings();
  return { model: settings.model, provider: settings.provider, apiKeyConfigured: Boolean(settings.apiKey) };
}

export function saveLLMSettings(input: LLMSettingsInput) {
  const current = readSavedSettings();
  const suppliedApiKey = input.apiKey?.trim();
  const apiKeyOverride = input.clearApiKey === true || Boolean(suppliedApiKey) || current?.apiKeyOverride === true;
  const next: SavedLLMSettings = {
    apiKey: input.clearApiKey ? '' : suppliedApiKey || current?.apiKey || '',
    apiKeyOverride,
    model: input.model.trim(),
    modelOverride: true,
    provider: input.provider,
    providerOverride: true,
  };

  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const temporaryPath = `${SETTINGS_PATH}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(next), { mode: 0o600 });
  renameSync(temporaryPath, SETTINGS_PATH);
  return getLLMSettingsSummary();
}

export function clearLLMSettings() {
  const reset: SavedLLMSettings = {
    apiKey: '',
    apiKeyOverride: true,
    model: '',
    modelOverride: false,
    provider: '',
    providerOverride: false,
  };
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const temporaryPath = `${SETTINGS_PATH}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(reset), { mode: 0o600 });
  renameSync(temporaryPath, SETTINGS_PATH);
  return getLLMSettingsSummary();
}

export const LLM_PROVIDER = SUPPORTED_PROVIDER;
export const LLM_DEFAULT_MODEL = DEFAULT_MODEL;
