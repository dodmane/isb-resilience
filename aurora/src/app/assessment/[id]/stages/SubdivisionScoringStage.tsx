'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { ScoringMethodControl, SubdimensionRatingReview } from '@/components/assessment/ScoringGovernance';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { NORMALIZATION_RANGES } from '@/lib/framework/scoring';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type MaturityLevel, type ScoringMethod } from '@/types/assessment';
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
  const [scoreError, setScoreError] = useState('');

  const stage6Approval = approvals.find(a => a.stage === 6);
  const isApproved = stage6Approval?.status === 'approved';

  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const hasScores = subdivisionScores.length > 0;
  const reviewMode: ScoringMethod = assessment.scoringMethod || (assessment.scoringPolicy?.reviewMode === 'manual' ? 'manual' : 'llm_assisted');

  async function generateScores() {
    setGenerating(true);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/subdivision-scores`, { method: 'POST' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not generate ratings');
      setScoreError('');
      await onRefresh();
    } catch (err) {
      console.error('Failed to generate scores:', err);
      setScoreError(err instanceof Error ? err.message : 'Could not generate ratings');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(notes: string) {
    const response = await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 6, status: 'approved', notes }),
    });
    if (!response.ok) { setScoreError((await response.json()).error || 'Approval failed'); return; }
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

  const manualReviewItems = reviewMode === 'llm_assisted' && hasScores
    ? deepDimensions.flatMap(dimension => (SUBDIVISIONS[dimension.key as DimensionKey] || []).flatMap(subdivision => {
      const score = getSubScore(dimension.key, subdivision.key);
      if (!score) return [{ dimension, subdivision, reason: 'No AI suggestion was saved. Enter a Level and Position manually.' }];
      const needsManualRating = score.status === 'stale' ||
        (score.status === 'needs_review' && score.maturityLevel === null) ||
        (score.isMockRecommendation && score.maturityLevel === null);
      if (!needsManualRating) return [];
      return [{ dimension, subdivision, reason: score.staleReason || score.rationale || 'AI could not suggest a supported rating. Enter one manually if the evidence supports it.' }];
    }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subdivision Scoring</h2>
        <p className="text-muted-foreground">
          Accept or edit an AI-suggested Level and Position, or enter your own rating. Leave unsupported sub-dimensions unscored.
        </p>
      </div>
      <ScoringMethodControl assessment={assessment} onRefresh={onRefresh} />
      {scoreError && <p role="alert" className="text-sm text-destructive">{scoreError}</p>}
      {hasScores && reviewMode === 'llm_assisted' && <Button variant="outline" onClick={generateScores} disabled={generating}>
        {generating ? 'Getting AI suggestions...' : 'Get AI Suggestions for Unreviewed Ratings'}
      </Button>}

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

      {!hasScores && reviewMode === 'llm_assisted' && (
        <div className="text-center py-8">
          <Button onClick={generateScores} disabled={generating} size="lg">
            {generating ? 'Getting AI Suggestions...' : 'Get AI Rating Suggestions'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">AI suggests Level and Position where accepted evidence supports a rating. You confirm or edit every suggestion.</p>
        </div>
      )}

      {(hasScores || reviewMode === 'manual') && (
        <>
          {manualReviewItems.length > 0 && (
            <div role="status" className="flex items-start gap-2 text-xs text-amber-700">
              <FlaskConical className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="space-y-2 min-w-0 break-words">
                <p className="font-medium">AI could not suggest a supported rating for {manualReviewItems.length} selected sub-dimension{manualReviewItems.length === 1 ? '' : 's'}. Enter a rating manually if you can support one, or leave it unscored.</p>
                <ul className="list-disc pl-4 space-y-1">{manualReviewItems.map(item =>
                  <li key={`${item.dimension.key}-${item.subdivision.key}`}><strong>{item.dimension.name} / {item.subdivision.name}:</strong>{' '}{item.reason}</li>
                )}</ul>
                <p>AI suggestions that are present also require reviewer confirmation before their score counts.</p>
              </div>
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
                  <div className="flex flex-wrap items-center gap-3">
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
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
                              {score.position || 'Evaluator override'}: {score.normalizedScore}/100
                            </div>
                          )}
                          {score && <p className="text-xs text-muted-foreground break-words">
                            {score.status.replaceAll('_', ' ')}{score.reviewedBy && ` · Reviewer: ${score.reviewedBy}`}
                            {score.reviewedAt && ` · ${score.reviewedAt.slice(0, 10)}`}
                          </p>}
                          {score?.staleReason && <p className="text-xs text-amber-700 break-words">{score.staleReason}</p>}
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
                              }}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              {score?.status === 'needs_review' ? 'Review / Accept Rating' : 'Enter / Edit Rating'}
                            </Button>
                          ) : (
                            <SubdimensionRatingReview
                              key={`${dim.key}-${sub.key}-${score?.updatedAt || 'new'}`} assessmentId={assessment.id}
                              dimensionKey={dim.key} subdivisionKey={sub.key} score={score} evidence={subEvidence}
                              onCancel={() => setOverrideTarget(null)}
                              onSaved={async () => { setOverrideTarget(null); setScoreError(''); await onRefresh(); }} />
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
