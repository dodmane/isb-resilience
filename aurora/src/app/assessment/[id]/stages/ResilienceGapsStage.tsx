'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { type Assessment, type StageApproval } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type ResilienceGap } from '@/types/resilience';
import { type AuditEntry } from '@/types/audit';
import { Shield, ShieldAlert, ShieldQuestion, ArrowRight } from 'lucide-react';

const CLASS_CONFIG = {
  strong: { icon: <Shield className="h-4 w-4 text-green-600" />, label: 'Strong', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  conditional: { icon: <ShieldQuestion className="h-4 w-4 text-amber-600" />, label: 'Conditional', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  exposed: { icon: <ShieldAlert className="h-4 w-4 text-red-600" />, label: 'Exposed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  resilienceGaps: ResilienceGap[];
  evidence: Evidence[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function ResilienceGapsStage({ assessment, approvals, resilienceGaps, evidence, auditTrail, onRefresh }: Props) {
  const [generating, setGenerating] = useState(false);

  const stage9Approval = approvals.find(a => a.stage === 9);
  const isApproved = stage9Approval?.status === 'approved';
  const hasGaps = resilienceGaps.length > 0;

  const grouped = useMemo(() => {
    const strong = resilienceGaps.filter(g => g.classification === 'strong');
    const conditional = resilienceGaps.filter(g => g.classification === 'conditional');
    const exposed = resilienceGaps.filter(g => g.classification === 'exposed');
    return { strong, conditional, exposed };
  }, [resilienceGaps]);

  async function generateGaps() {
    setGenerating(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/resilience-gaps`, { method: 'POST' });
      await onRefresh();
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  }

  async function handleApprove(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 9, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 9, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  function getEvidence(ids: string[]): Evidence[] {
    return evidence.filter(e => ids.includes(e.id));
  }

  if (!hasGaps) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Resilience Gaps</h2>
        <div className="text-center py-8">
          <Button onClick={generateGaps} disabled={generating} size="lg">
            {generating ? 'Analyzing...' : 'Identify Resilience Gaps'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Resilience Gaps</h2>
        <p className="text-muted-foreground">
          Gaps identified from approved scoring and scenario analysis. Recommendations remain at
          framework/leadership level — no detailed implementation plans or consulting prescriptions.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['exposed', 'conditional', 'strong'] as const).map(cls => {
          const conf = CLASS_CONFIG[cls];
          const items = grouped[cls];
          return (
            <Card key={cls} className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-2">{conf.icon}</div>
                <p className="text-2xl font-bold">{items.length}</p>
                <Badge className={conf.color}>{conf.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="exposed">
        <TabsList>
          {(['exposed', 'conditional', 'strong'] as const).map(cls => (
            <TabsTrigger key={cls} value={cls} className="gap-1">
              {CLASS_CONFIG[cls].icon} {CLASS_CONFIG[cls].label} ({grouped[cls].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(['exposed', 'conditional', 'strong'] as const).map(cls => (
          <TabsContent key={cls} value={cls} className="space-y-4">
            {grouped[cls].length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No {cls} gaps identified.</p>
            ) : (
              grouped[cls].map(gap => {
                const dim = DIMENSIONS.find(d => d.key === gap.dimensionKey);
                const scenario = SCENARIOS.find(s => s.key === gap.scenarioKey);
                const gapEvidence = getEvidence(gap.supportingEvidenceIds);

                return (
                  <Card key={gap.id}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {CLASS_CONFIG[gap.classification].icon}
                        {dim?.name || gap.dimensionKey}
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {scenario?.name || gap.scenarioKey}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Base</p>
                          <MaturityBadge level={gap.currentMaturity as 1|2|3|4|null} />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Scenario</p>
                          <MaturityBadge level={gap.scenarioMaturity as 1|2|3|4|null} />
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded p-3 text-xs">
                        <p className="font-medium mb-1">Gap</p>
                        <p>{gap.gapDescription}</p>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/20 rounded p-3 text-xs border border-red-200 dark:border-red-800">
                        <p className="font-medium mb-1 text-red-800 dark:text-red-200">Business Implication</p>
                        <p className="text-red-700 dark:text-red-300">{gap.businessImplication}</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-3 text-xs border border-blue-200 dark:border-blue-800">
                        <p className="font-medium mb-1 text-blue-800 dark:text-blue-200">Leadership Recommendation</p>
                        <p className="text-blue-700 dark:text-blue-300">{gap.recommendation}</p>
                      </div>

                      {gapEvidence.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Supporting Evidence ({gapEvidence.length})</p>
                          {gapEvidence.slice(0, 3).map(ev => (
                            <div key={ev.id} className="flex items-center gap-2 text-xs border rounded p-1.5 mb-1">
                              <span className="flex-1 truncate">{ev.claim}</span>
                              <SourceLink url={ev.sourceUrl} urlResolved={ev.urlResolved} />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Tabs defaultValue="audit">
        <TabsList><TabsTrigger value="audit">Audit Trail</TabsTrigger></TabsList>
        <TabsContent value="audit"><AuditTrail entries={auditTrail} /></TabsContent>
      </Tabs>

      <Separator />
      <ReviewCheckpoint stageName="Resilience Gaps" isApproved={isApproved} onApprove={handleApprove} onReject={handleReject} />
    </div>
  );
}
