'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { EvaluationReadiness } from '@/components/assessment/ScoringGovernance';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { summarizeAssessment, type calculateEvidenceMatchedComparison } from '@/lib/framework/scoring';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval } from '@/types/assessment';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';
import { type AuditEntry } from '@/types/audit';
import { AlertTriangle, ArrowRight } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Assessment[]>([]);
  const [comparisonId, setComparisonId] = useState('');
  const [comparison, setComparison] = useState<ReturnType<typeof calculateEvidenceMatchedComparison> | null>(null);
  const summary = summarizeAssessment(subdivisionScores);

  useEffect(() => {
    let active = true;
    fetch('/api/assessments').then(response => {
      if (!response.ok) throw new Error('Could not load assessments');
      return response.json();
    }).then((data: Assessment[]) => { if (active) setCompanies(data); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!comparisonId) return;
    fetch(`/api/assessments/${assessment.id}/dimension-scores?summary=true&compareWith=${encodeURIComponent(comparisonId)}`)
      .then(response => {
        if (!response.ok) throw new Error('Could not load comparison');
        return response.json();
      }).then(data => { if (active) setComparison(data.likeForLike); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [assessment.id, comparisonId, subdivisionScores]);

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
      const response = await fetch(`/api/assessments/${assessment.id}/dimension-scores`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not calculate dimension scores');
      setError('');
      await onRefresh();
    } catch (err) {
      console.error('Failed to calculate scores:', err);
      setError(err instanceof Error ? err.message : 'Could not calculate dimension scores');
    } finally {
      setCalculating(false);
    }
  }

  async function handleApprove(notes: string) {
    const response = await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 7, status: 'approved', notes }),
    });
    if (!response.ok) { setError((await response.json()).error || 'Approval failed'); return; }
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
          Equal-weight dimension and composite scores.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <EvaluationReadiness assessment={assessment} scores={subdivisionScores} />
      <section className="border-y py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div><p className="text-xs text-muted-foreground">Overall Composite</p>
            <p className="text-xl font-semibold">{summary.composite.normalizedScore?.toFixed(1) ?? 'Insufficient coverage'}</p>
          </div>
          <MaturityBadge level={summary.composite.maturityLevel} />
          <div className="text-sm">{summary.composite.qualifyingCount}/15 dimensions</div>
          <div className="text-sm">{summary.scoredCount}/{summary.totalCount} sub-dimensions ({summary.coveragePercent.toFixed(1)}%)</div>
        </div>
        <p className="text-sm text-muted-foreground">Bias check: {summary.composite.biasFlag.replaceAll('_', ' ')}
          {summary.composite.biasDelta !== null && ` (${summary.composite.biasDelta > 0 ? '+' : ''}${summary.composite.biasDelta.toFixed(2)} points)`}
        </p>
        <label className="flex flex-wrap items-center gap-2 text-sm">Compare with <span className="text-xs text-muted-foreground">(optional)</span>
          <select aria-label="Comparison assessment" className="border rounded px-2 py-1 bg-background max-w-full"
            value={comparisonId} onChange={event => { setComparisonId(event.target.value); setComparison(null); setError(''); }}>
            <option value="">Select assessment</option>
            {companies.filter(company => company.id !== assessment.id).map(company =>
              <option key={company.id} value={company.id}>{company.companyName}</option>
            )}
          </select>
        </label>
        {comparisonId && comparison && <div className="text-sm space-y-1">
          <p>Like-for-like: {comparison.dimensionKeys.length}/15 shared dimensions</p>
          <p>{comparison.matchedCount}/45 matched sub-dimensions · {comparison.reason}</p>
          <p>{assessment.companyName}: {comparison.first.normalizedScore?.toFixed(1) ?? 'Insufficient coverage'}</p>
          <p>{companies.find(company => company.id === comparisonId)?.companyName}: {comparison.second.normalizedScore?.toFixed(1) ?? 'Insufficient coverage'}</p>
        </div>}
        {comparisonId && !comparison && !error && <p className="text-xs text-muted-foreground">Loading comparison...</p>}
      </section>
      {hasScores && <Button variant="outline" onClick={calculateScores} disabled={calculating}>
        {calculating ? 'Calculating...' : 'Recalculate Dimension Scores'}
      </Button>}

      {!hasScores && (
        <div className="text-center py-8">
          <Button onClick={calculateScores} disabled={calculating} size="lg">
            {calculating ? 'Calculating...' : 'Calculate Dimension Scores'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Each dimension needs 2 rated sub-dimensions. The composite uses every dimension that qualifies; no minimum dimension count is set.
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
              <div className="space-y-1 overflow-x-auto">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] min-w-[640px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <span>Dimension</span>
                  <span className="text-center">Maturity</span>
                  <span className="text-center">Score</span>
                  <span className="text-center">Confidence</span>
                  <span className="text-center">Status</span>
                </div>

                {deepDimensions.map(dim => {
                  const dimScore = dimensionScores.find(s => s.dimensionKey === dim.key);
                  const dimSubs = subdivisionScores.filter(s => s.dimensionKey === dim.key);
                  const coverage = summary.dimensions[dim.key];

                  return (
                    <div key={dim.key}>
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] min-w-[640px] gap-2 items-center py-2 border-b text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{dim.number}.</span>
                          <span className="font-medium">{dim.name}</span>
                        </div>
                        <div className="text-center">
                          <MaturityBadge level={dimScore?.maturityLevel ?? null} />
                        </div>
                        <div className="text-center text-sm">
                          {dimScore?.normalizedScore !== null && dimScore?.normalizedScore !== undefined
                            ? <span className="font-mono">{dimScore.normalizedScore.toFixed(1)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                        <div className="text-center">
                          {dimScore ? <ConfidenceBadge confidence={dimScore.confidence} /> : '—'}
                        </div>
                        <div className="text-center">
                          <Badge variant="outline" className="text-[10px]">{coverage.evidenceStatus} {coverage.scoredCount}/{coverage.totalCount}</Badge>
                        </div>
                      </div>

                      {/* Subdivision breakdown */}
                      <div className="ml-8 space-y-0.5">
                        {dimSubs.map(subScore => {
                          const sub = SUBDIVISIONS[dim.key as DimensionKey]?.find(s => s.key === subScore.subdivisionKey);
                          return (
                            <div key={subScore.subdivisionKey} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] min-w-[608px] gap-2 items-center py-1 text-xs text-muted-foreground">
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
                    Each dimension averages its rated sub-dimensions. At least 2 of 3 must be rated; otherwise that dimension is not scored.
                    The overall score averages every dimension that qualifies. If none qualify, no composite can be calculated.
                    Missing ratings are left out, not counted as zero. The Level comes from the unrounded average&apos;s score band.
                    Confidence describes evidence quality; it does not change the score.
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
