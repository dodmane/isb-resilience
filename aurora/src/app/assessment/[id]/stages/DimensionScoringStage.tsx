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
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { MATURITY_LABELS } from '@/lib/framework/scoring';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type MaturityLevel } from '@/types/assessment';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';
import { type AuditEntry } from '@/types/audit';
import { AlertTriangle, ArrowRight, Edit3, Info } from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  subdivisionScores: SubdivisionScore[];
  dimensionScores: DimensionScore[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function DimensionScoringStage({
  assessment, approvals, subdivisionScores, dimensionScores, auditTrail, onRefresh,
}: Props) {
  const [calculating, setCalculating] = useState(false);
  const [overrideDim, setOverrideDim] = useState<string | null>(null);
  const [overrideLevel, setOverrideLevel] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const stage7Approval = approvals.find(a => a.stage === 7);
  const isApproved = stage7Approval?.status === 'approved';

  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const hasScores = dimensionScores.length > 0;

  async function calculateScores() {
    setCalculating(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/dimension-scores`, { method: 'POST' });
      await onRefresh();
    } catch (err) {
      console.error('Failed to calculate scores:', err);
    } finally {
      setCalculating(false);
    }
  }

  async function submitOverride() {
    if (!overrideDim || !overrideReason.trim()) return;
    const ml = overrideLevel === '' ? null : Number(overrideLevel) as MaturityLevel;
    await fetch(`/api/assessments/${assessment.id}/dimension-scores`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensionKey: overrideDim,
        maturityLevel: ml,
        overrideReason,
      }),
    });
    setOverrideDim(null);
    setOverrideLevel('');
    setOverrideReason('');
    await onRefresh();
  }

  async function handleApprove(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 7, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 7, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dimension Scoring</h2>
        <p className="text-muted-foreground">
          Dimension maturity is calculated by averaging the approved subdivision scores.
          Review the results and override if needed.
        </p>
      </div>

      {/* Normalization disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium">About Normalized Scores</p>
          <p>
            The 0–100 normalized score is an interpretive representation of the 1–4 maturity level
            and does not imply mathematical precision. The maturity level (1–4) is the primary
            assessment result. Normalization uses anchored ranges:
            Level 1 = 25–40, Level 2 = 50–65, Level 3 = 70–85, Level 4 = 90–100.
          </p>
        </div>
      </div>

      {!hasScores && (
        <div className="text-center py-8">
          <Button onClick={calculateScores} disabled={calculating} size="lg">
            {calculating ? 'Calculating...' : 'Calculate Dimension Scores'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Dimension maturity = average of subdivision maturity scores.
          </p>
        </div>
      )}

      {hasScores && (
        <>
          {/* Summary table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">15-Dimension Maturity Profile</CardTitle>
              <CardDescription>
                Assessment Confidence is shown separately from maturity and does not influence the score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <span>Dimension</span>
                  <span className="text-center">Maturity</span>
                  <span className="text-center">Normalized</span>
                  <span className="text-center">Confidence</span>
                  <span className="text-center">Status</span>
                </div>

                {deepDimensions.map(dim => {
                  const dimScore = dimensionScores.find(s => s.dimensionKey === dim.key);
                  const dimSubs = subdivisionScores.filter(s => s.dimensionKey === dim.key);

                  return (
                    <div key={dim.key}>
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center py-2 border-b text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{dim.number}.</span>
                          <span className="font-medium">{dim.name}</span>
                          {dimScore?.status === 'overridden' && (
                            <Badge variant="outline" className="text-[10px]">Overridden</Badge>
                          )}
                        </div>
                        <div className="text-center">
                          <MaturityBadge level={dimScore?.maturityLevel ?? null} />
                        </div>
                        <div className="text-center text-sm">
                          {dimScore?.normalizedScore !== null && dimScore?.normalizedScore !== undefined
                            ? <span className="font-mono">{dimScore.normalizedScore}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                        <div className="text-center">
                          {dimScore ? <ConfidenceBadge confidence={dimScore.confidence} /> : '—'}
                        </div>
                        <div className="text-center">
                          {dimScore?.status === 'insufficient_evidence' ? (
                            <Badge variant="outline" className="text-[10px] text-amber-600">
                              Not Scored
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => {
                                setOverrideDim(dim.key);
                                setOverrideLevel(dimScore?.maturityLevel?.toString() || '');
                              }}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Override
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Subdivision breakdown */}
                      <div className="ml-8 space-y-0.5">
                        {dimSubs.map(subScore => {
                          const sub = SUBDIVISIONS[dim.key as DimensionKey]?.find(s => s.key === subScore.subdivisionKey);
                          return (
                            <div key={subScore.subdivisionKey} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center py-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                {sub?.name || subScore.subdivisionKey}
                              </div>
                              <div className="text-center">
                                <MaturityBadge level={subScore.maturityLevel} />
                              </div>
                              <div className="text-center font-mono">
                                {subScore.normalizedScore ?? '—'}
                              </div>
                              <div className="text-center">
                                <ConfidenceBadge confidence={subScore.confidence} />
                              </div>
                              <div className="text-center">
                                {subScore.evidenceIds.length} evidence
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Override panel */}
                      {overrideDim === dim.key && (
                        <div className="ml-8 mt-2 mb-2 border rounded p-3 space-y-2 bg-muted/30">
                          <p className="text-xs font-medium">Override {dim.name} Maturity Level</p>
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
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={submitOverride} disabled={!overrideReason.trim()}>
                              Apply Override
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setOverrideDim(null); setOverrideReason(''); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {dimScore?.overrideReason && (
                        <div className="ml-8 my-1 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs border border-blue-200 dark:border-blue-800">
                          <span className="font-medium text-blue-800 dark:text-blue-200">Override: </span>
                          <span className="text-blue-700 dark:text-blue-300">{dimScore.overrideReason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Scoring methodology note */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Scoring Methodology</p>
                  <p>
                    Dimension maturity = average of applicable subdivision maturity scores (rounded to nearest integer).
                    No weights are applied. Confidence is assessed separately and does not influence the maturity score.
                    Dimensions without scored subdivisions are marked NOT SCORED — INSUFFICIENT EVIDENCE.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
            stageName="Dimension Scoring"
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}
