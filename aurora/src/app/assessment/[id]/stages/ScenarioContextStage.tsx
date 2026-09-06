'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { type Assessment, type StageApproval } from '@/types/assessment';
import { type AuditEntry } from '@/types/audit';
import { FlaskConical, Zap, CloudLightning, Settings, AlertTriangle } from 'lucide-react';

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  autonomous_advantage: <Zap className="h-5 w-5 text-green-600" />,
  storm_and_signal: <CloudLightning className="h-5 w-5 text-amber-600" />,
  managed_modernization: <Settings className="h-5 w-5 text-blue-600" />,
  exposed_and_reactive: <AlertTriangle className="h-5 w-5 text-red-600" />,
};

const AXIS_LABELS: Record<string, string> = {
  autonomous_advantage: 'High AI / Stable Macro',
  storm_and_signal: 'High AI / High Macro Disruption',
  managed_modernization: 'Low AI / Stable Macro',
  exposed_and_reactive: 'Low AI / High Macro Disruption',
};

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function ScenarioContextStage({ assessment, approvals, auditTrail, onRefresh }: Props) {
  const [narratives, setNarratives] = useState<Record<string, string>>(
    assessment.scenarioNarratives || {}
  );
  const [generating, setGenerating] = useState(false);
  const hasNarratives = Object.keys(narratives).length === 4;

  const stage2Approval = approvals.find(a => a.stage === 2);
  const isApproved = stage2Approval?.status === 'approved';

  async function generateNarratives() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/scenarios`, { method: 'POST' });
      const data = await res.json();
      setNarratives(data.narratives);
      await onRefresh();
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
    } finally {
      setGenerating(false);
    }
  }

  async function saveNarratives() {
    await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioNarratives: narratives }),
    });
  }

  async function handleApprove(notes: string) {
    await saveNarratives();
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 2, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 2, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Scenario Context</h2>
        <p className="text-muted-foreground">
          Four plausible futures contextualized for {assessment.companyName}.
        </p>
      </div>

      {/* 2x2 scenario matrix */}
      <Card>
        <CardHeader>
          <CardTitle>AURORA Scenario Matrix</CardTitle>
          <CardDescription>
            AI Implementation Depth × Macro-Disruption Intensity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-0 text-sm">
            <div />
            <div className="text-center font-medium py-2 border-b">Low / Stable Macro</div>
            <div className="text-center font-medium py-2 border-b">High / Disruptive Macro</div>

            <div className="font-medium py-4 pr-4 border-r text-right">High AI</div>
            <div className="p-3 border-r border-b bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                {SCENARIO_ICONS.autonomous_advantage} Autonomous Advantage
              </div>
            </div>
            <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                {SCENARIO_ICONS.storm_and_signal} Storm and Signal
              </div>
            </div>

            <div className="font-medium py-4 pr-4 border-r text-right">Low AI</div>
            <div className="p-3 border-r bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                {SCENARIO_ICONS.managed_modernization} Managed Modernization
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/30">
              <div className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
                {SCENARIO_ICONS.exposed_and_reactive} Exposed and Reactive
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasNarratives && (
        <div className="text-center py-8">
          <Button onClick={generateNarratives} disabled={generating} size="lg">
            {generating ? 'Generating Scenario Narratives...' : 'Generate Scenario Narratives'}
          </Button>
        </div>
      )}

      {hasNarratives && (
        <>
          {Object.values(narratives).some(n => n.includes('[MOCK AI')) && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <FlaskConical className="h-3.5 w-3.5" />
              Heuristic narratives — review and edit before approval.
            </div>
          )}

          <div className="space-y-4">
            {SCENARIOS.map(scenario => (
              <Card key={scenario.key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {SCENARIO_ICONS[scenario.key]}
                    {scenario.name}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {AXIS_LABELS[scenario.key]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={narratives[scenario.key] || ''}
                    onChange={e => setNarratives(prev => ({ ...prev, [scenario.key]: e.target.value }))}
                    rows={6}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="audit">
            <TabsList>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>
            <TabsContent value="audit">
              <AuditTrail entries={auditTrail} />
            </TabsContent>
          </Tabs>

          <Separator />
          <ReviewCheckpoint
            stageName="Scenario Context"
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}
