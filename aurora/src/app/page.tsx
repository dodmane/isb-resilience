'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { STAGE_LABELS, type Assessment, type DataSourceMode } from '@/types/assessment';
import { Plus, ArrowRight, Shield, BookOpen, Trash2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('public');
  const [creating, setCreating] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('claude-sonnet-4-6');
  const [llmProvider, setLlmProvider] = useState('anthropic');
  const [llmKeyConfigured, setLlmKeyConfigured] = useState(false);
  const [clearLlmKey, setClearLlmKey] = useState(false);
  const [savingLlmSettings, setSavingLlmSettings] = useState(false);
  const [resettingLlmSettings, setResettingLlmSettings] = useState(false);
  const [llmSettingsMessage, setLlmSettingsMessage] = useState('');
  const [llmSettingsError, setLlmSettingsError] = useState('');

  function loadAssessments() {
    fetch('/api/assessments')
      .then((r) => r.json())
      .then(setAssessments)
      .catch(console.error);
  }

  useEffect(() => {
    loadAssessments();
    fetch('/api/settings/llm')
      .then(async response => {
        if (!response.ok) throw new Error('Could not load LLM settings.');
        return response.json();
      })
      .then(settings => {
        setLlmModel(settings.model);
        setLlmProvider(settings.provider);
        setLlmKeyConfigured(settings.apiKeyConfigured);
      })
      .catch(error => setLlmSettingsError(error.message));
  }, []);

  async function saveLlmSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLlmSettings(true);
    setLlmSettingsMessage('');
    setLlmSettingsError('');
    try {
      const response = await fetch('/api/settings/llm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: llmApiKey,
          clearApiKey: clearLlmKey,
          model: llmModel,
          provider: llmProvider,
        }),
      });
      const settings = await response.json();
      if (!response.ok) throw new Error(settings.error || 'Could not save LLM settings.');
      setLlmApiKey('');
      setClearLlmKey(false);
      setLlmKeyConfigured(settings.apiKeyConfigured);
      setLlmSettingsMessage('LLM settings saved and active.');
    } catch (error) {
      setLlmSettingsError(error instanceof Error ? error.message : 'Could not save LLM settings.');
    } finally {
      setSavingLlmSettings(false);
    }
  }

  async function resetLlmSettings() {
    if (!confirm('Clear the saved API key and reset the model and provider to environment defaults? The API key configured in this app will be removed.')) return;
    setResettingLlmSettings(true);
    setLlmSettingsMessage('');
    setLlmSettingsError('');
    try {
      const response = await fetch('/api/settings/llm', { method: 'DELETE' });
      const settings = await response.json();
      if (!response.ok) throw new Error(settings.error || 'Could not clear LLM settings.');
      setLlmApiKey('');
      setClearLlmKey(false);
      setLlmModel(settings.model);
      setLlmProvider(settings.provider);
      setLlmKeyConfigured(settings.apiKeyConfigured);
      setLlmSettingsMessage('Saved key cleared; model and provider reset to environment defaults.');
    } catch (error) {
      setLlmSettingsError(error instanceof Error ? error.message : 'Could not clear LLM settings.');
    } finally {
      setResettingLlmSettings(false);
    }
  }

  async function deleteAssessment(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this assessment? This cannot be undone.')) return;
    await fetch(`/api/assessments/${id}`, { method: 'DELETE' });
    loadAssessments();
  }

  async function createAssessment() {
    if (!companyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, dataSourceMode }),
      });
      const assessment = await res.json();
      router.push(`/assessment/${assessment.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="aurora-gradient text-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AURORA</h1>
            <p className="text-sm text-white/70 mt-1">
              Adaptive, Uncertainty, Resilience, Opportunity &amp; Risk Assessment
            </p>
            <p className="text-xs text-white/50 mt-0.5">Enterprise Business Resilience Framework — SaaS/IT Lens</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/methodology')} variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              <BookOpen className="h-4 w-4 mr-2" />
              Scoring Methodology
            </Button>
            <Button onClick={() => setShowNew(true)} variant="secondary" size="lg" className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {showNew && (
          <Card className="mb-8 shadow-lg border-primary/20">
            <CardHeader className="aurora-gradient-subtle">
              <CardTitle>New Assessment</CardTitle>
              <CardDescription>Enter a company name to begin a resilience assessment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="e.g. Salesforce, DocuSign"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createAssessment()}
                />
              </div>
              <div>
                <Label>Data Source</Label>
                <div className="flex gap-3 mt-2">
                  {(['public', 'uploaded', 'both'] as DataSourceMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant={dataSourceMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDataSourceMode(mode)}
                    >
                      {mode === 'public'
                        ? 'Public Data'
                        : mode === 'uploaded'
                          ? 'Uploaded Documents'
                          : 'Public + Uploaded'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={createAssessment} disabled={creating || !companyName.trim()}>
                  {creating ? 'Creating...' : 'Start Assessment'}
                </Button>
                <Button variant="ghost" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {assessments.length === 0 && !showNew ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full aurora-gradient-subtle mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No assessments yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a new assessment to begin evaluating business resilience
              across 15 AURORA dimensions and 4 future scenarios.
            </p>
            <Button onClick={() => setShowNew(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create First Assessment
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assessments.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer card-hover"
                onClick={() => router.push(`/assessment/${a.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{a.companyName}</CardTitle>
                  <CardDescription>{a.industry || 'Industry not set'}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Stage {a.currentStage}: {STAGE_LABELS[a.currentStage]}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteAssessment(e, a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-base">LLM Configuration</CardTitle>
            <CardDescription>Configure the provider used for AI-assisted research and scoring. The API key is saved on this AURORA instance and is never sent back to the browser. Enter a new key to replace it; leave the field blank to keep it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveLlmSettings} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">LLM_PROVIDER</Label>
                <select id="llm-provider" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={llmProvider} onChange={event => setLlmProvider(event.target.value)}>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claude-model">CLAUDE_MODEL</Label>
                <Input id="claude-model" value={llmModel} onChange={event => setLlmModel(event.target.value)}
                  placeholder="claude-sonnet-4-6" required maxLength={160} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="anthropic-api-key">ANTHROPIC_API_KEY</Label>
                <Input id="anthropic-api-key" type="password" autoComplete="new-password" value={llmApiKey}
                  onChange={event => { setLlmApiKey(event.target.value); setClearLlmKey(false); }}
                  placeholder={llmKeyConfigured ? 'Key configured; leave blank to keep it' : 'Paste an Anthropic API key'} />
                <p className="text-xs text-muted-foreground">{llmKeyConfigured ? 'An API key is configured.' : 'No API key is configured.'} Settings apply immediately to all users of this instance.</p>
              </div>
              {llmKeyConfigured && (
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={clearLlmKey} onChange={event => setClearLlmKey(event.target.checked)} />
                  Clear the configured API key and disable the environment fallback
                </label>
              )}
              {llmSettingsError && <p role="alert" className="text-sm text-destructive md:col-span-2">{llmSettingsError}</p>}
              {llmSettingsMessage && <p role="status" className="text-sm text-green-700 md:col-span-2">{llmSettingsMessage}</p>}
              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={savingLlmSettings || resettingLlmSettings}>
                  {savingLlmSettings ? 'Saving...' : 'Save LLM Settings'}
                </Button>
                <Button type="button" variant="destructive" onClick={resetLlmSettings}
                  disabled={savingLlmSettings || resettingLlmSettings}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {resettingLlmSettings ? 'Clearing...' : 'Clear Key and Reset Settings'}
                </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
