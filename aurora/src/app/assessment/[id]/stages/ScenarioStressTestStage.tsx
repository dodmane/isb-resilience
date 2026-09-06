'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { MATURITY_LABELS } from '@/lib/framework/scoring';
import { type Assessment, type StageApproval, type MaturityLevel } from '@/types/assessment';
import { type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type Evidence } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { type ScenarioKey } from '@/lib/framework/scenarios';
import {
  FlaskConical, TrendingUp, TrendingDown, Minus, CheckCircle2, Edit3,
  Zap, CloudLightning, Settings, AlertTriangle,
} from 'lucide-react';

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  autonomous_advantage: <Zap className="h-4 w-4 text-green-600" />,
  storm_and_signal: <CloudLightning className="h-4 w-4 text-amber-600" />,
  managed_modernization: <Settings className="h-4 w-4 text-blue-600" />,
  exposed_and_reactive: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

const SCENARIO_COLORS: Record<string, string> = {
  autonomous_advantage: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30',
  storm_and_signal: 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30',
  managed_modernization: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30',
  exposed_and_reactive: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30',
};

const DIRECTION_ICON = {
  strengthens: <TrendingUp className="h-4 w-4 text-green-600" />,
  stable: <Minus className="h-4 w-4 text-muted-foreground" />,
  weakens: <TrendingDown className="h-4 w-4 text-red-600" />,
};

const DIRECTION_LABEL = {
  strengthens: 'Strengthens',
  stable: 'Stable',
  weakens: 'Weakens',
};

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  dimensionScores: DimensionScore[];
  scenarioAssessments: ScenarioAssessment[];
  evidence: Evidence[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function ScenarioStressTestStage({
  assessment, approvals, dimensionScores, scenarioAssessments, evidence, auditTrail, onRefresh,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('autonomous_advantage');
  const [overrideTarget, setOverrideTarget] = useState<{ scenario: ScenarioKey; dim: string } | null>(null);
  const [overrideLevel, setOverrideLevel] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const stage8Approval = approvals.find(a => a.stage === 8);
  const isApproved = stage8Approval?.status === 'approved';

  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const hasAssessments = scenarioAssessments.length > 0;

  const activeAssessments = useMemo(
    () => scenarioAssessments.filter(sa => sa.scenarioKey === activeScenario),
    [scenarioAssessments, activeScenario]
  );

  const scenarioStats = useMemo(() => {
    const stats: Record<string, { strengthens: number; stable: number; weakens: number; approved: number; total: number }> = {};
    for (const s of SCENARIOS) {
      const items = scenarioAssessments.filter(sa => sa.scenarioKey === s.key);
      stats[s.key] = {
        strengthens: items.filter(i => i.direction === 'strengthens').length,
        stable: items.filter(i => i.direction === 'stable').length,
        weakens: items.filter(i => i.direction === 'weakens').length,
        approved: items.filter(i => i.userApproved).length,
        total: items.length,
      };
    }
    return stats;
  }, [scenarioAssessments]);

  async function generateAssessments() {
    setGenerating(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/scenario-assessments`, { method: 'POST' });
      await onRefresh();
    } catch (err) {
      console.error('Failed to generate scenario assessments:', err);
    } finally {
      setGenerating(false);
    }
  }

  async function approveItem(scenarioKey: ScenarioKey, dimensionKey: string) {
    await fetch(`/api/assessments/${assessment.id}/scenario-assessments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioKey, dimensionKey, userApproved: true }),
    });
    await onRefresh();
  }

  async function submitOverride() {
    if (!overrideTarget || !overrideReason.trim()) return;
    const ml = overrideLevel === '' ? null : Number(overrideLevel) as MaturityLevel;
    await fetch(`/api/assessments/${assessment.id}/scenario-assessments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioKey: overrideTarget.scenario,
        dimensionKey: overrideTarget.dim,
        scenarioMaturity: ml,
        overrideReason,
        userApproved: true,
      }),
    });
    setOverrideTarget(null);
    setOverrideLevel('');
    setOverrideReason('');
    await onRefresh();
  }

  async function handleApprove(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 8, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 8, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  function getRelatedEvidence(evidenceIds: string[]): Evidence[] {
    return evidence.filter(e => evidenceIds.includes(e.id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Scenario Stress Test</h2>
        <p className="text-muted-foreground">
          Assess how base maturity behaves under each of the four AURORA scenarios.
          Review each adjustment, approve or override with reason.
        </p>
      </div>

      {!hasAssessments && (
        <div className="text-center py-8">
          <Button onClick={generateAssessments} disabled={generating} size="lg">
            {generating ? 'Generating Scenario Assessments...' : 'Generate Scenario Stress Test'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            AI will evaluate how each dimension performs under the four AURORA scenarios.
          </p>
        </div>
      )}

      {hasAssessments && (
        <>
          {scenarioAssessments.some(sa => sa.isMockRecommendation) && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <FlaskConical className="h-3.5 w-3.5" />
              Some assessments use heuristic reasoning — review each before approval.
            </div>
          )}

          {/* Comparison heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scenario Comparison</CardTitle>
              <CardDescription>Base maturity vs. scenario-adjusted maturity across all dimensions.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Dimension</th>
                    <th className="text-center py-2 px-2 font-medium">Base</th>
                    {SCENARIOS.map(s => (
                      <th key={s.key} className="text-center py-2 px-2 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          {SCENARIO_ICONS[s.key]}
                          <span className="hidden xl:inline">{s.name}</span>
                          <span className="xl:hidden">{s.name.split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deepDimensions.map(dim => {
                    const dimScore = dimensionScores.find(s => s.dimensionKey === dim.key);
                    return (
                      <tr key={dim.key} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4">
                          <span className="text-muted-foreground">{dim.number}.</span> {dim.name}
                        </td>
                        <td className="text-center py-2 px-2">
                          <MaturityBadge level={dimScore?.maturityLevel ?? null} />
                        </td>
                        {SCENARIOS.map(s => {
                          const sa = scenarioAssessments.find(
                            a => a.scenarioKey === s.key && a.dimensionKey === dim.key
                          );
                          return (
                            <td key={s.key} className="text-center py-2 px-2">
                              <div className="flex items-center justify-center gap-1">
                                {sa && DIRECTION_ICON[sa.direction]}
                                <MaturityBadge level={sa?.scenarioMaturity ?? null} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Scenario tabs with detailed assessments */}
          <Tabs value={activeScenario} onValueChange={v => setActiveScenario(v as ScenarioKey)}>
            <TabsList className="flex-wrap h-auto gap-1">
              {SCENARIOS.map(s => {
                const stats = scenarioStats[s.key];
                return (
                  <TabsTrigger key={s.key} value={s.key} className="gap-1.5 text-xs">
                    {SCENARIO_ICONS[s.key]}
                    {s.name}
                    {stats && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {stats.approved}/{stats.total}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {SCENARIOS.map(scenario => (
              <TabsContent key={scenario.key} value={scenario.key} className="space-y-4">
                <Card className={SCENARIO_COLORS[scenario.key]}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {SCENARIO_ICONS[scenario.key]}
                      {scenario.name}
                    </CardTitle>
                    <CardDescription>{scenario.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-xs">
                      <span>AI: <strong>{scenario.aiDepth === 'high' ? 'High' : 'Low'}</strong></span>
                      <span>Macro: <strong>{scenario.macroDisruption === 'stable' ? 'Stable' : 'Disruptive'}</strong></span>
                      {scenarioStats[scenario.key] && (
                        <>
                          <span className="text-green-700">↑ {scenarioStats[scenario.key].strengthens}</span>
                          <span className="text-muted-foreground">→ {scenarioStats[scenario.key].stable}</span>
                          <span className="text-red-700">↓ {scenarioStats[scenario.key].weakens}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {activeAssessments.map(sa => {
                  const dim = DIMENSIONS.find(d => d.key === sa.dimensionKey);
                  if (!dim) return null;
                  const relEvidence = getRelatedEvidence(sa.relevantEvidenceIds);
                  const isOverriding = overrideTarget?.scenario === scenario.key && overrideTarget?.dim === dim.key;

                  return (
                    <Card key={`${scenario.key}-${dim.key}`}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-muted-foreground">{dim.number}.</span>
                            {dim.name}
                            {sa.userApproved && (
                              <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Approved
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <ConfidenceBadge confidence={sa.confidence} />
                            <div className="flex items-center gap-1">
                              {DIRECTION_ICON[sa.direction]}
                              <span className="text-xs font-medium">{DIRECTION_LABEL[sa.direction]}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {/* Base vs Scenario */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Base</p>
                            <MaturityBadge level={sa.baseMaturity} />
                          </div>
                          <div className="text-lg text-muted-foreground">→</div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Scenario</p>
                            <MaturityBadge level={sa.scenarioMaturity} />
                          </div>
                        </div>

                        {/* Rationale */}
                        <div className="bg-muted/50 rounded p-3 text-xs">
                          <p className="font-medium mb-1">Rationale</p>
                          <p>{sa.rationale}</p>
                        </div>

                        {/* Override notice */}
                        {sa.overrideReason && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3 text-xs border border-blue-200 dark:border-blue-800">
                            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">User Override</p>
                            <p className="text-blue-700 dark:text-blue-300">{sa.overrideReason}</p>
                          </div>
                        )}

                        {/* Supporting evidence */}
                        {relEvidence.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">Supporting Evidence ({relEvidence.length})</p>
                            <div className="space-y-1">
                              {relEvidence.slice(0, 3).map(ev => (
                                <div key={ev.id} className="text-xs flex items-center gap-2 border rounded p-1.5">
                                  <span className="flex-1 truncate">{ev.claim}</span>
                                  {ev.sourceUrl && ev.urlResolved && (
                                    <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                                      Source ↗
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!sa.userApproved && !isOverriding && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-300"
                                onClick={() => approveItem(scenario.key, dim.key)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs"
                                onClick={() => {
                                  setOverrideTarget({ scenario: scenario.key, dim: dim.key });
                                  setOverrideLevel(sa.scenarioMaturity?.toString() || '');
                                }}>
                                <Edit3 className="h-3 w-3 mr-1" /> Override
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Override panel */}
                        {isOverriding && (
                          <div className="border rounded p-3 space-y-2 bg-muted/30">
                            <p className="text-xs font-medium">Override Scenario Maturity for {dim.name}</p>
                            <select
                              className="border rounded px-2 py-1 text-sm bg-background w-full"
                              value={overrideLevel}
                              onChange={e => setOverrideLevel(e.target.value)}
                            >
                              <option value="">NOT SCORED</option>
                              {([1, 2, 3, 4] as MaturityLevel[]).map(l => (
                                <option key={l} value={l}>Level {l}: {MATURITY_LABELS[l]}</option>
                              ))}
                            </select>
                            <Textarea
                              placeholder="Override reason (required)"
                              value={overrideReason}
                              onChange={e => setOverrideReason(e.target.value)}
                              rows={2} className="text-xs"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={submitOverride} disabled={!overrideReason.trim()}>
                                Apply Override &amp; Approve
                              </Button>
                              <Button size="sm" variant="ghost"
                                onClick={() => { setOverrideTarget(null); setOverrideReason(''); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>

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
            stageName="Scenario Stress Test"
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}
