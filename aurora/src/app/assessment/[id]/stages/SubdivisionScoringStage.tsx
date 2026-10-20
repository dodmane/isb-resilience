'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { ScoringMethodControl, SubdimensionRatingReview } from '@/components/assessment/ScoringGovernance';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS, getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { NORMALIZATION_RANGES } from '@/lib/framework/scoring';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type MaturityLevel, type ScoringMethod } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type SubdivisionScore } from '@/types/scoring';
import { type AuditEntry } from '@/types/audit';
import {
  FlaskConical, ChevronDown, ChevronRight, AlertTriangle, Edit3, CheckCircle2, Clock3, RotateCcw, Plus, Trash2, Sparkles,
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
  const [generatingDimension, setGeneratingDimension] = useState<string | null>(null);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{ dim: string; sub: string } | null>(null);
  const [scoreError, setScoreError] = useState('');
  const [bulkReviewer, setBulkReviewer] = useState('');
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [bulkAcceptProgress, setBulkAcceptProgress] = useState('');
  const [bulkAcceptMessage, setBulkAcceptMessage] = useState('');
  const [addingDimension, setAddingDimension] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customHints, setCustomHints] = useState('');
  const [restoreSelections, setRestoreSelections] = useState<Record<string, string>>({});
  const [savingSubdivisionScope, setSavingSubdivisionScope] = useState(false);

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

  async function generateScores(dimensionKey?: string) {
    setGenerating(true);
    setGeneratingDimension(dimensionKey || null);
    setScoreError('');
    let refreshInProgress = false;
    const refreshTimer = window.setInterval(() => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      void onRefresh().catch(console.error).finally(() => { refreshInProgress = false; });
    }, 3000);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/subdivision-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dimensionKey ? { dimensionKey } : {}),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not generate ratings');
      const generated = await response.json();
      setScoreError(generated.length ? '' : 'No new AI suggestions were generated. Check accepted evidence for this dimension.');
    } catch (err) {
      console.error('Failed to generate scores:', err);
      setScoreError(err instanceof Error ? err.message : 'Could not generate ratings');
    } finally {
      window.clearInterval(refreshTimer);
      await onRefresh().catch(console.error);
      setGenerating(false);
      setGeneratingDimension(null);
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

  async function saveSubdivisionScope(customSubdivisions: NonNullable<Assessment['customSubdivisions']>, excludedSubdivisionKeys: string[]) {
    setSavingSubdivisionScope(true);
    setScoreError('');
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/subdivisions`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customSubdivisions, excludedSubdivisionKeys }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update sub-dimensions');
      await onRefresh();
      return true;
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Could not update sub-dimensions');
      return false;
    } finally {
      setSavingSubdivisionScope(false);
    }
  }

  async function addCustomSubdivision(dimensionKey: string) {
    const name = customName.trim();
    const description = customDescription.trim();
    if (!name || !description) return;
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'subdimension';
    const usedKeys = new Set([
      ...(assessment.customSubdivisions || []).map(item => `${item.dimensionKey}:${item.key}`),
      ...Object.entries(SUBDIVISIONS).flatMap(([key, items]) => items.map(item => `${key}:${item.key}`)),
    ]);
    let key = `custom_${normalized}`;
    let suffix = 2;
    while (usedKeys.has(`${dimensionKey}:${key}`)) key = `custom_${normalized}_${suffix++}`;
    const customSubdivisions = [...(assessment.customSubdivisions || []), {
      dimensionKey: dimensionKey as DimensionKey,
      key,
      name,
      description,
      evidenceHints: customHints.split(',').map(hint => hint.trim()).filter(Boolean),
    }];
    const saved = await saveSubdivisionScope(customSubdivisions, assessment.excludedSubdivisionKeys || []);
    if (saved) {
      setCustomName('');
      setCustomDescription('');
      setCustomHints('');
      setAddingDimension(null);
    }
  }

  async function removeSubdivision(dimensionKey: string, subdivisionKey: string) {
    const excluded = new Set(assessment.excludedSubdivisionKeys || []);
    excluded.add(`${dimensionKey}:${subdivisionKey}`);
    await saveSubdivisionScope(assessment.customSubdivisions || [], [...excluded]);
  }

  async function restoreSubdivision(dimensionKey: string) {
    const subdivisionKey = restoreSelections[dimensionKey];
    if (!subdivisionKey) return;
    const excluded = new Set(assessment.excludedSubdivisionKeys || []);
    excluded.delete(`${dimensionKey}:${subdivisionKey}`);
    const saved = await saveSubdivisionScope(assessment.customSubdivisions || [], [...excluded]);
    if (saved) setRestoreSelections(previous => ({ ...previous, [dimensionKey]: '' }));
  }

  function getReviewState(score?: SubdivisionScore) {
    if (score?.status === 'stale') return { label: 'Re-review required', state: 'stale' as const };
    if (!score || score.status === 'needs_review' || !score.reviewedAt || !score.reviewedBy) {
      return { label: 'Pending confirmation', state: 'pending' as const };
    }
    if (score.status === 'insufficient_evidence') return { label: 'Confirmed · unscored', state: 'unscored' as const };
    return { label: 'Confirmed', state: 'confirmed' as const };
  }

  function getSubEvidence(dimKey: string, subKey: string): Evidence[] {
    return evidence.filter(e => e.dimensionKey === dimKey && e.subdivisionKey === subKey && e.status === 'accepted');
  }

  const pendingAiRatings = deepDimensions.flatMap(dimension =>
    getAssessmentSubdivisions(dimension.key as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
      .flatMap(subdivision => {
        const score = getSubScore(dimension.key, subdivision.key);
        if (!score || score.status !== 'needs_review' || score.maturityLevel === null || !score.position) return [];
        const evidenceIds = score.evidenceIds.filter(id =>
          getSubEvidence(dimension.key, subdivision.key).some(item => item.id === id && !item.isMock)
        );
        return evidenceIds.length ? [{ dimensionKey: dimension.key, subdivisionKey: subdivision.key, score, evidenceIds }] : [];
      })
  );

  const pendingAiRatingCount = deepDimensions.reduce((count, dimension) => count +
    getAssessmentSubdivisions(dimension.key as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
      .filter(subdivision => getSubScore(dimension.key, subdivision.key)?.status === 'needs_review').length, 0);

  async function acceptAllAiRatings() {
    if (!bulkReviewer.trim() || pendingAiRatings.length === 0) return;
    setBulkAccepting(true);
    setScoreError('');
    setBulkAcceptMessage('');
    let acceptedCount = 0;
    const failures: string[] = [];
    try {
      for (const [index, item] of pendingAiRatings.entries()) {
        setBulkAcceptProgress(`Confirming ${index + 1} of ${pendingAiRatings.length}...`);
        const response = await fetch(`/api/assessments/${assessment.id}/subdivision-scores`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ratingMethod: 'level_position',
            dimensionKey: item.dimensionKey,
            subdivisionKey: item.subdivisionKey,
            maturityLevel: item.score.maturityLevel,
            position: item.score.position,
            evidenceIds: item.evidenceIds,
            rationale: item.score.rationale,
            reviewedBy: bulkReviewer.trim(),
            confidence: item.score.confidence,
          }),
        });
        if (response.ok) acceptedCount++;
        else failures.push(`${item.dimensionKey}/${item.subdivisionKey}: ${(await response.json()).error || 'could not confirm'}`);
      }
      await onRefresh();
      if (failures.length) {
        setScoreError(`${acceptedCount} rating${acceptedCount === 1 ? '' : 's'} confirmed; ${failures.length} failed. ${failures[0]}`);
      } else {
        setBulkAcceptMessage(`${acceptedCount} AI rating${acceptedCount === 1 ? '' : 's'} confirmed by ${bulkReviewer.trim()}.`);
      }
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Could not accept all AI ratings.');
      await onRefresh();
    } finally {
      setBulkAccepting(false);
      setBulkAcceptProgress('');
    }
  }

  const manualReviewItems = reviewMode === 'llm_assisted' && hasScores
    ? deepDimensions.flatMap(dimension => getAssessmentSubdivisions(
      dimension.key as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys,
    ).flatMap(subdivision => {
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
      {hasScores && reviewMode === 'llm_assisted' && <Button variant="outline" onClick={() => generateScores()} disabled={generating}>
        {generating ? 'Getting AI suggestions...' : 'Get AI Suggestions for Unreviewed Ratings'}
      </Button>}
      {hasScores && reviewMode === 'llm_assisted' && (
        <div className="flex flex-wrap items-end gap-2 border-b pb-4">
          <label className="min-w-48 flex-1 space-y-1 text-xs font-medium">
            Reviewer confirming all ratings
            <Input aria-label="Reviewer confirming all ratings" value={bulkReviewer}
              onChange={event => setBulkReviewer(event.target.value)} placeholder="Reviewer name" disabled={bulkAccepting} />
          </label>
          <Button type="button" variant="outline" onClick={acceptAllAiRatings}
            disabled={bulkAccepting || !bulkReviewer.trim() || pendingAiRatings.length === 0}>
            {bulkAccepting ? bulkAcceptProgress : `Accept all eligible AI ratings (${pendingAiRatings.length})`}
          </Button>
          {pendingAiRatingCount > pendingAiRatings.length && (
            <p className="basis-full text-xs text-amber-700">{pendingAiRatingCount - pendingAiRatings.length} pending suggestion(s) lack a complete rating or accepted evidence and need individual review.</p>
          )}
          {bulkAcceptMessage && <p role="status" className="basis-full text-sm text-emerald-700">{bulkAcceptMessage}</p>}
        </div>
      )}

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
          <Button onClick={() => generateScores()} disabled={generating} size="lg">
            {generating ? 'Getting AI Suggestions...' : 'Get AI Rating Suggestions'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">AI suggests Level and Position where accepted evidence supports a rating. You confirm or edit every suggestion.</p>
        </div>
      )}

      {(hasScores || reviewMode === 'manual' || deepDimensions.length > 0) && (
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
            const subs = getAssessmentSubdivisions(dim.key as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys);
            const allSubdivisions = getAssessmentSubdivisions(dim.key as DimensionKey, assessment.customSubdivisions);
            const excludedKeys = new Set(assessment.excludedSubdivisionKeys || []);
            const restorableSubdivisions = allSubdivisions.filter(sub => excludedKeys.has(`${dim.key}:${sub.key}`));
            const isExpanded = expandedDim === dim.key;
            const confirmedCount = subs.filter(sub => {
              const state = getReviewState(getSubScore(dim.key, sub.key)).state;
              return state === 'confirmed' || state === 'unscored';
            }).length;

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
                      <p className="text-xs text-muted-foreground mt-1">{confirmedCount} of {subs.length} ratings confirmed</p>
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
                    {reviewMode === 'llm_assisted' && (
                      <Button type="button" size="sm" variant="outline" disabled={generating}
                        onClick={event => { event.stopPropagation(); void generateScores(dim.key); }}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        {generatingDimension === dim.key ? 'Generating...' : 'Get AI suggestions'}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex flex-wrap items-center gap-2 border-b pb-3">
                      <select
                        aria-label={`Sub-dimension to restore for ${dim.name}`}
                        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                        value={restoreSelections[dim.key] || ''}
                        onChange={event => setRestoreSelections(previous => ({ ...previous, [dim.key]: event.target.value }))}
                        disabled={savingSubdivisionScope || restorableSubdivisions.length === 0}
                      >
                        <option value="">Restore removed sub-dimension</option>
                        {restorableSubdivisions.map(sub => <option key={sub.key} value={sub.key}>{sub.name}</option>)}
                      </select>
                      <Button type="button" size="sm" variant="outline" onClick={() => restoreSubdivision(dim.key)}
                        disabled={savingSubdivisionScope || !restoreSelections[dim.key]}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />Restore
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setAddingDimension(addingDimension === dim.key ? null : dim.key)}
                        disabled={savingSubdivisionScope}>
                        <Plus className="mr-1 h-3.5 w-3.5" />Add custom
                      </Button>
                    </div>

                    {addingDimension === dim.key && (
                      <div className="space-y-2 rounded border p-3">
                        <p className="text-sm font-medium">New custom sub-dimension</p>
                        <Input aria-label="Custom sub-dimension name" placeholder="Name" value={customName} onChange={event => setCustomName(event.target.value)} />
                        <Textarea aria-label="Custom sub-dimension description" placeholder="What capability or risk does it assess?" value={customDescription} onChange={event => setCustomDescription(event.target.value)} rows={2} />
                        <Input aria-label="Custom sub-dimension evidence hints" placeholder="Evidence hints, comma-separated (optional)" value={customHints} onChange={event => setCustomHints(event.target.value)} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => addCustomSubdivision(dim.key)} disabled={savingSubdivisionScope || !customName.trim() || !customDescription.trim()}>
                            {savingSubdivisionScope ? 'Saving...' : 'Add sub-dimension'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setAddingDimension(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {subs.length === 0 && <p className="text-sm text-muted-foreground">No active sub-dimensions. Restore a framework item or add a custom one.</p>}

                    {subs.map((sub, subIdx) => {
                      const score = getSubScore(dim.key, sub.key);
                      const subEvidence = getSubEvidence(dim.key, sub.key);
                      const isOverriding = overrideTarget?.dim === dim.key && overrideTarget?.sub === sub.key;
                      const reviewState = getReviewState(score);
                      const reviewStateStyles = {
                        confirmed: 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800',
                        unscored: 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800',
                        pending: 'text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-800',
                        stale: 'text-red-700 border-red-300 dark:text-red-300 dark:border-red-800',
                      };

                      return (
                        <div key={sub.key} className="border rounded-lg p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                <span className="text-muted-foreground">{dim.number}.{subIdx + 1}</span>{' '}
                                {sub.name}
                              </p>
                              {sub.key.startsWith('custom_') && <Badge variant="outline" className="mt-1 text-[10px] border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300">Custom</Badge>}
                              <p className="text-xs text-muted-foreground">{sub.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`gap-1 whitespace-nowrap ${reviewStateStyles[reviewState.state]}`}>
                                {reviewState.state === 'confirmed' || reviewState.state === 'unscored'
                                  ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  : reviewState.state === 'stale'
                                    ? <RotateCcw className="h-3 w-3" aria-hidden="true" />
                                    : <Clock3 className="h-3 w-3" aria-hidden="true" />}
                                {reviewState.label}
                              </Badge>
                              {score && (
                                <Badge variant="outline" className={score.ratingOrigin === 'reviewer'
                                  ? 'whitespace-nowrap border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300'
                                  : 'whitespace-nowrap border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300'}>
                                  {score.ratingOrigin === 'reviewer'
                                    ? score.aiSuggestedMaturityLevel != null ? 'Reviewer override/review' : 'Reviewer entered'
                                    : 'AI suggested'}
                                </Badge>
                              )}
                              {score && <ConfidenceBadge confidence={score.confidence} />}
                              <MaturityBadge level={score?.maturityLevel ?? null} />
                            </div>
                          </div>

                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => removeSubdivision(dim.key, sub.key)} disabled={savingSubdivisionScope}
                            aria-label={`Remove ${sub.name} from this assessment`}>
                            <Trash2 className="mr-1 h-3 w-3" />Remove from assessment
                          </Button>

                          {score?.normalizedScore !== null && score?.normalizedScore !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {score.position || 'Evaluator override'}: {score.normalizedScore}/100
                            </div>
                          )}
                          {score?.aiSuggestedMaturityLevel != null && score.aiSuggestedPosition && (
                            <p className="text-xs text-sky-700 dark:text-sky-300">
                              Original AI suggestion: Level {score.aiSuggestedMaturityLevel}, Position {score.aiSuggestedPosition}
                            </p>
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
                          {score?.overrideReason && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3 text-xs border border-blue-200 dark:border-blue-800">
                              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Reviewer Override Reason</p>
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
                              {score?.status === 'needs_review' && score.maturityLevel !== null && score.position
                                ? 'Review / Override AI Suggestion'
                                : score?.ratingOrigin === 'reviewer' ? 'Edit Reviewer Rating' : 'Enter / Edit Rating'}
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
