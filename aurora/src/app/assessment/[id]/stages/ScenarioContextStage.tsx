'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { FlaskConical, Zap, CloudLightning, Settings, AlertTriangle, TrendingDown } from 'lucide-react';

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  revenue_compression: <TrendingDown className="h-5 w-5 text-red-600" />,
  cloud_cyber_outage: <CloudLightning className="h-5 w-5 text-amber-600" />,
  cogs_margin_squeeze: <Zap className="h-5 w-5 text-purple-600" />,
  talent_attrition: <AlertTriangle className="h-5 w-5 text-orange-600" />,
  capital_market_freeze: <Settings className="h-5 w-5 text-blue-600" />,
  ai_disruption_commodity: <Zap className="h-5 w-5 text-indigo-600" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue_compression: 'Financial Shock',
  cloud_cyber_outage: 'Operational Shock',
  cogs_margin_squeeze: 'Financial Shock',
  talent_attrition: 'Human Capital Shock',
  capital_market_freeze: 'Financial Shock',
  ai_disruption_commodity: 'Market & AI Shock',
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
  const hasNarratives = Object.keys(narratives).length === SCENARIOS.length;

  const stage2Approval = approvals.find(a => a.stage === 2);
  const isApproved = stage2Approval?.status === 'approved';

  async function generateNarratives() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/scenarios`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate scenario narratives');
        return;
      }
      setNarratives(data.narratives);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate scenarios');
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
          Six factor-based shock injection vectors contextualized for {assessment.companyName}.
        </p>
      </div>

      {/* Factor-Based Shock Injection Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>AURORA Factor-Based Stress Testing Matrix</CardTitle>
          <CardDescription>
            Targeted Shock Vectors & Vulnerability Elasticities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {SCENARIOS.map(s => (
              <div key={s.key} className="p-3 border rounded-lg space-y-1 bg-card">
                <div className="flex items-center gap-2 font-medium">
                  {SCENARIO_ICONS[s.key]}
                  <span>{s.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Trigger: </span>{s.triggerCondition}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Driver: </span>{s.sensitivityDriver}
                </div>
              </div>
            ))}
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
                      {CATEGORY_LABELS[scenario.key] || scenario.category}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={narratives[scenario.key] || ''}
                    onChange={e => setNarratives(prev => ({ ...prev, [scenario.key]: e.target.value }))}
                    rows={4}
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
