'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { MATURITY_LABELS, NORMALIZATION_RANGES } from '@/lib/framework/scoring';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type MaturityLevel } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type SubdivisionScore } from '@/types/scoring';
import { type AuditEntry } from '@/types/audit';
import {
  FlaskConical, ChevronDown, ChevronRight, AlertTriangle, Edit3,
} from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  evidence: Evidence[];
  subdivisionScores: SubdivisionScore[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function SubdivisionScoringStage({
  assessment, approvals, evidence, subdivisionScores, auditTrail, onRefresh,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{ dim: string; sub: string } | null>(null);
  const [overrideLevel, setOverrideLevel] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');

  const stage6Approval = approvals.find(a => a.stage === 6);
  const isApproved = stage6Approval?.status === 'approved';

  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const hasScores = subdivisionScores.length > 0;

  async function generateScores() {
    setGenerating(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/subdivision-scores`, { method: 'POST' });
      await onRefresh();
    } catch (err) {
      console.error('Failed to generate scores:', err);
    } finally {
      setGenerating(false);
    }
  }

  async function submitOverride() {
    if (!overrideTarget || !overrideReason.trim()) return;
    const ml = overrideLevel === '' ? null : Number(overrideLevel) as MaturityLevel;
    await fetch(`/api/assessments/${assessment.id}/subdivision-scores`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensionKey: overrideTarget.dim,
        subdivisionKey: overrideTarget.sub,
        maturityLevel: ml,
        overrideReason,
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
      body: JSON.stringify({ stage: 6, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 6, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  function getSubScore(dimKey: string, subKey: string): SubdivisionScore | undefined {
    return subdivisionScores.find(s => s.dimensionKey === dimKey && s.subdivisionKey === subKey);
  }

  function getSubEvidence(dimKey: string, subKey: string): Evidence[] {
    return evidence.filter(e => e.dimensionKey === dimKey && e.subdivisionKey === subKey && e.status === 'accepted');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subdivision Scoring</h2>
        <p className="text-muted-foreground">
          Score each subdivision using the AURORA 1–4 maturity scale based on accepted evidence.
          Review recommendations, override if needed (with mandatory reason), then approve.
        </p>
      </div>

      {/* Maturity scale reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AURORA Maturity Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-sm">
            {([1, 2, 3, 4] as MaturityLevel[]).map(level => (
              <div key={level} className="text-center">
                <MaturityBadge level={level} />
                <p className="text-xs text-muted-foreground mt-1">
                  {NORMALIZATION_RANGES[level][0]}–{NORMALIZATION_RANGES[level][1]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!hasScores && (
        <div className="text-center py-8">
          <Button onClick={generateScores} disabled={generating} size="lg">
            {generating ? 'Generating Recommendations...' : 'Generate Maturity Recommendations'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            AI will propose maturity levels based on accepted evidence.
          </p>
        </div>
      )}

      {hasScores && (
        <>
          {subdivisionScores.some(s => s.isMockRecommendation) && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <FlaskConical className="h-3.5 w-3.5" />
              Some recommendations use heuristic scoring — review each score and override where appropriate.
            </div>
          )}

          {deepDimensions.map(dim => {
            const subs = SUBDIVISIONS[dim.key as DimensionKey];
            const isExpanded = expandedDim === dim.key;

            return (
              <Card key={dim.key}>
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => setExpandedDim(isExpanded ? null : dim.key)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1">
                      <CardTitle className="text-sm">
                        <span className="text-muted-foreground">{dim.number}.</span> {dim.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {subs.map(sub => {
                        const score = getSubScore(dim.key, sub.key);
                        return (
                          <div key={sub.key} className="text-center">
                            <MaturityBadge level={score?.maturityLevel ?? null} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {subs.map((sub, subIdx) => {
                      const score = getSubScore(dim.key, sub.key);
                      const subEvidence = getSubEvidence(dim.key, sub.key);
                      const isOverriding = overrideTarget?.dim === dim.key && overrideTarget?.sub === sub.key;

                      return (
                        <div key={sub.key} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                <span className="text-muted-foreground">{dim.number}.{subIdx + 1}</span>{' '}
                                {sub.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{sub.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {score && <ConfidenceBadge confidence={score.confidence} />}
                              <MaturityBadge level={score?.maturityLevel ?? null} />
                            </div>
                          </div>

                          {score?.normalizedScore !== null && score?.normalizedScore !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              Normalized: {score.normalizedScore}/100
                            </div>
                          )}

                          {/* Rationale */}
                          {score?.rationale && (
                            <div className="bg-muted/50 rounded p-3 text-xs">
                              <p className="font-medium mb-1">Rationale</p>
                              <p>{score.rationale}</p>
                            </div>
                          )}

                          {/* Override indicator */}
                          {score?.status === 'overridden' && score.overrideReason && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3 text-xs border border-blue-200 dark:border-blue-800">
                              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">User Override</p>
                              <p className="text-blue-700 dark:text-blue-300">{score.overrideReason}</p>
                            </div>
                          )}

                          {/* Insufficient evidence */}
                          {score?.status === 'insufficient_evidence' && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded text-xs border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                              <span className="text-amber-700 dark:text-amber-300">
                                NOT SCORED — INSUFFICIENT EVIDENCE
                              </span>
                            </div>
                          )}

                          {/* Supporting evidence */}
                          <div>
                            <p className="text-xs font-medium mb-1">
                              Supporting Evidence ({subEvidence.length})
                            </p>
                            {subEvidence.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No accepted evidence</p>
                            ) : (
                              <div className="space-y-1.5">
                                {subEvidence.map(ev => (
                                  <div key={ev.id} className="flex items-start gap-2 text-xs border rounded p-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{ev.claim}</p>
                                      <p className="text-muted-foreground truncate">{ev.sourceTitle}</p>
                                    </div>
                                    <SourceLink url={ev.sourceUrl} urlResolved={ev.urlResolved} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Override control */}
                          {!isOverriding ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                setOverrideTarget({ dim: dim.key, sub: sub.key });
                                setOverrideLevel(score?.maturityLevel?.toString() || '');
                              }}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Override Score
                            </Button>
                          ) : (
                            <div className="border rounded p-3 space-y-2 bg-muted/30">
                              <p className="text-xs font-medium">Override Maturity Level</p>
                              <div className="flex gap-2">
                                <select
                                  className="border rounded px-2 py-1 text-sm bg-background"
                                  value={overrideLevel}
                                  onChange={e => setOverrideLevel(e.target.value)}
                                >
                                  <option value="">NOT SCORED</option>
                                  {([1, 2, 3, 4] as MaturityLevel[]).map(l => (
                                    <option key={l} value={l}>Level {l}: {MATURITY_LABELS[l]}</option>
                                  ))}
                                </select>
                              </div>
                              <Textarea
                                placeholder="Override reason (required)"
                                value={overrideReason}
                                onChange={e => setOverrideReason(e.target.value)}
                                rows={2}
                                className="text-xs"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={submitOverride}
                                  disabled={!overrideReason.trim()}
                                >
                                  Apply Override
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setOverrideTarget(null);
                                    setOverrideReason('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}

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
            stageName="Subdivision Scoring"
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}
