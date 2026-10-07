import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getEvidenceForAssessment,
  getSubdivisionScores,
  upsertSubdivisionScore,
  addAuditEntry,
  invalidateApprovalsAfterStage,
} from '@/lib/db/store';
import { recommendSubdivisionRatingAsync } from '@/lib/llm/rating-recommendation';
import { RATING_PROMPT_VERSION } from '@/lib/llm/rating-recommendation';
import { isLLMConfigured, getScoringModel } from '@/lib/llm/client';
import { SCORING_PROMPT_VERSION } from '@/lib/llm/scoring-recommendation';
import { normalize, scoreToMaturity, isScoringPosition, type ScoringPosition } from '@/lib/framework/scoring';
import { validPolicy, getCriterionReviewMode, evaluateCriteria, evidenceSnapshot, CriterionValidationError, type CriterionFinding } from '@/lib/framework/criteria';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type SubdivisionScore } from '@/types/scoring';
import { type Confidence } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scores = getSubdivisionScores(id);
  return NextResponse.json(scores);
}

// Generate recommendations for all subdivisions
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }
  const scoringMethod = assessment.scoringMethod || getCriterionReviewMode(assessment.scoringPolicy);
  if (scoringMethod === 'manual') {
    return NextResponse.json({ error: 'Manual review is selected. Enter Level and Position in each sub-dimension; AI suggestions are disabled.' }, { status: 409 });
  }

  const evidence = getEvidenceForAssessment(id);
  const existing = getSubdivisionScores(id);
  const deepDims = (assessment.dimensionSelections || []).filter(s => s.deepAssessment);
  const now = new Date().toISOString();
  const newScores: SubdivisionScore[] = [];

  for (const dimSel of deepDims) {
    const subs = SUBDIVISIONS[dimSel.dimensionKey as DimensionKey] || [];
    for (const sub of subs) {
      const alreadyScored = existing.find(
        s => s.dimensionKey === dimSel.dimensionKey && s.subdivisionKey === sub.key && !!s.reviewedAt && s.status !== 'stale'
      );
      if (alreadyScored) continue;

      const subEvidence = evidence.filter(
        e => e.dimensionKey === dimSel.dimensionKey && e.subdivisionKey === sub.key
      );

      const recommendation = await recommendSubdivisionRatingAsync(dimSel.dimensionKey, sub.key, subEvidence);

      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId: id,
        dimensionKey: dimSel.dimensionKey,
        subdivisionKey: sub.key,
        maturityLevel: recommendation.maturityLevel,
        position: recommendation.position,
        ratingMethod: 'level_position',
        scoreOverride: null,
        normalizedScore: null,
        absoluteScore: null,
        reviewedAt: null,
        reviewedBy: null,
        extractionModel: isLLMConfigured() ? getScoringModel() : 'manual',
        promptVersion: RATING_PROMPT_VERSION,
        confidence: recommendation.confidence,
        status: 'needs_review',
        rationale: recommendation.rationale,
        overrideReason: null,
        evidenceIds: recommendation.evidenceIds,
        isMockRecommendation: recommendation.isFallback || !isLLMConfigured(),
        evidenceSnapshot: evidenceSnapshot(subEvidence.filter(item => recommendation.evidenceIds.includes(item.id))),
        policy: assessment.scoringPolicy,
        createdAt: now,
        updatedAt: now,
      };

      upsertSubdivisionScore(score);
      newScores.push(score);
    }
  }

  invalidateApprovalsAfterStage(id, 5);
  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'subdivision_scoring_generated',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { generatedCount: newScores.length },
    reason: 'Level/Position ratings suggested from accepted evidence; reviewer confirmation required',
    actor: 'system',
    timestamp: now,
  });

  return NextResponse.json(newScores);
}

// Update a single subdivision score (override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  if (body.ratingMethod === 'level_position') {
    const assessment = getAssessment(id);
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    const { dimensionKey, subdivisionKey, maturityLevel, position, evidenceIds, rationale, reviewedBy, confidence } = body as {
      dimensionKey: string; subdivisionKey: string; maturityLevel: number | null; position: ScoringPosition | null;
      evidenceIds: string[]; rationale?: string; reviewedBy: string; confidence?: Confidence;
    };
    if (!SUBDIVISIONS[dimensionKey as DimensionKey]?.some(sub => sub.key === subdivisionKey)) {
      return NextResponse.json({ error: 'Unknown dimension or subdivision' }, { status: 400 });
    }
    const isUnscored = maturityLevel === null && position === null;
    if (!isUnscored && (maturityLevel === null || ![1, 2, 3, 4].includes(maturityLevel) || !isScoringPosition(position))) {
      return NextResponse.json({ error: 'Select both a Level (1-4) and Position (Low/Mid/High), or leave both unscored.' }, { status: 400 });
    }
    if (typeof reviewedBy !== 'string' || !reviewedBy.trim()) {
      return NextResponse.json({ error: 'Reviewer name is required' }, { status: 400 });
    }
    const allEvidence = getEvidenceForAssessment(id).filter(item => item.dimensionKey === dimensionKey && item.subdivisionKey === subdivisionKey);
    const acceptedEvidence = allEvidence.filter(item => item.status === 'accepted' && !item.isMock);
    const selectedIds = Array.isArray(evidenceIds) ? [...new Set(evidenceIds.filter((value): value is string => typeof value === 'string'))] : [];
    if (!isUnscored && (!selectedIds.length || selectedIds.some(evidenceId => !acceptedEvidence.some(item => item.id === evidenceId)))) {
      return NextResponse.json({ error: 'Choose at least one accepted, non-mock evidence item assigned to this sub-dimension.' }, { status: 400 });
    }
    if (confidence && !['high', 'medium', 'low'].includes(confidence)) {
      return NextResponse.json({ error: 'Confidence must be high, medium or low.' }, { status: 400 });
    }

    const existing = getSubdivisionScores(id).find(item => item.dimensionKey === dimensionKey && item.subdivisionKey === subdivisionKey);
    const now = new Date().toISOString();
    const linkedEvidence = acceptedEvidence.filter(item => selectedIds.includes(item.id));
    const level = isUnscored ? null : maturityLevel as 1 | 2 | 3 | 4;
    const selectedPosition = isUnscored ? null : position;
    const normalizedScore = level && selectedPosition ? normalize(level, selectedPosition) : null;
    const rating: SubdivisionScore = {
      id: existing?.id || uuidv4(), assessmentId: id, dimensionKey, subdivisionKey,
      maturityLevel: level, position: selectedPosition, ratingMethod: 'level_position',
      normalizedScore, absoluteScore: normalizedScore, confidence: confidence || existing?.confidence || 'medium',
      status: isUnscored ? 'insufficient_evidence' : 'scored',
      rationale: typeof rationale === 'string' && rationale.trim() ? rationale.trim() : isUnscored ? 'Reviewer left this sub-dimension unscored.' : 'Level and Position confirmed by reviewer.',
      overrideReason: null, evidenceIds: selectedIds, criteria: undefined, extractionIssue: undefined,
      policy: assessment.scoringPolicy, evidenceSnapshot: evidenceSnapshot(linkedEvidence),
      reviewedAt: now, reviewedBy: reviewedBy.trim(), staleReason: undefined,
      extractionModel: existing?.extractionModel || 'manual', promptVersion: SCORING_PROMPT_VERSION,
      isMockRecommendation: false, createdAt: existing?.createdAt || now, updatedAt: now,
    };
    upsertSubdivisionScore(rating);
    invalidateApprovalsAfterStage(id, 5);
    addAuditEntry({ id: uuidv4(), assessmentId: id, action: 'subdivision_rating_confirmed', entityType: 'subdivision_score', entityId: rating.id,
      oldValue: existing ? { maturityLevel: existing.maturityLevel, position: existing.position, status: existing.status } : null,
      newValue: { maturityLevel: rating.maturityLevel, position: rating.position, normalizedScore: rating.normalizedScore, evidenceIds: rating.evidenceIds, reviewedBy: rating.reviewedBy },
      reason: rating.rationale, actor: 'user', timestamp: now });
    return NextResponse.json(rating);
  }

  const { dimensionKey, subdivisionKey, criteria, scoreOverride, overrideReason, reviewedBy } = body as {
    dimensionKey: string;
    subdivisionKey: string;
    criteria: CriterionFinding[];
    scoreOverride?: number | null;
    overrideReason: string;
    reviewedBy: string;
  };

  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }
  if (!validPolicy(assessment.scoringPolicy)) return NextResponse.json({ error: 'Freeze the scoring policy before reviewing criteria' }, { status: 409 });
  if ('maturityLevel' in body || 'position' in body) return NextResponse.json({ error: 'Level and Position are calculated from criteria, not editable inputs' }, { status: 400 });
  if (!SUBDIVISIONS[dimensionKey as DimensionKey]?.some(sub => sub.key === subdivisionKey)) {
    return NextResponse.json({ error: 'Unknown dimension or subdivision' }, { status: 400 });
  }

  const hasOverride = scoreOverride != null;
  if (hasOverride && (!Number.isInteger(scoreOverride) || scoreToMaturity(scoreOverride!) === null || (scoreOverride! > 2 && scoreOverride! < 98))) {
    return NextResponse.json({ error: 'Score override must be an integer in 0-2 or 98-100', validationIssue: {
      criterionId: null, fields: ['endpointException'], message: 'Use an integer from 0-2 or 98-100.' } }, { status: 400 });
  }
  if (typeof overrideReason !== 'string' || !overrideReason.trim()) {
    return NextResponse.json({ error: 'Written justification required', validationIssue: {
      criterionId: null, fields: ['reviewReason'], message: 'Enter the review decision and justification.' } }, { status: 400 });
  }
  if (typeof reviewedBy !== 'string' || !reviewedBy.trim()) return NextResponse.json({ error: 'Reviewer name is required', validationIssue: {
    criterionId: null, fields: ['reviewer'], message: 'Enter the reviewer name.' } }, { status: 400 });
  const subEvidence = getEvidenceForAssessment(id).filter(e =>
    e.dimensionKey === dimensionKey && e.subdivisionKey === subdivisionKey
  );
  let result;
  let absolute;
  try {
    result = evaluateCriteria(subdivisionKey, criteria, subEvidence, assessment.scoringPolicy);
    absolute = evaluateCriteria(subdivisionKey, criteria, subEvidence, { ...assessment.scoringPolicy, profile: 'standard' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid criterion findings',
      validationIssue: error instanceof CriterionValidationError ? error.issue : null }, { status: 400 });
  }
  if (hasOverride && (result.maturityLevel === null || scoreToMaturity(scoreOverride!) !== result.maturityLevel)) {
    return NextResponse.json({ error: 'An endpoint exception requires reviewed criteria supporting the same Level (1 or 4)', validationIssue: {
      criterionId: null, fields: ['endpointException'], message: 'The reviewed criteria must support Level 1 for a 0-2 exception, or Level 4 for a 98-100 exception.' } }, { status: 400 });
  }

  const existing = getSubdivisionScores(id);
  const current = existing.find(
    s => s.dimensionKey === dimensionKey && s.subdivisionKey === subdivisionKey
  );

  const now = new Date().toISOString();
  const score: SubdivisionScore = {
    id: current?.id || uuidv4(),
    assessmentId: id,
    dimensionKey,
    subdivisionKey,
    maturityLevel: result.maturityLevel,
    position: result.position,
    scoreOverride: hasOverride ? scoreOverride : null,
    normalizedScore: hasOverride ? scoreOverride! : result.maturityLevel && result.position ? normalize(result.maturityLevel, result.position) : null,
    absoluteScore: absolute.maturityLevel && absolute.position ? normalize(absolute.maturityLevel, absolute.position) : null,
    criteria,
    policy: assessment.scoringPolicy,
    evidenceSnapshot: evidenceSnapshot(subEvidence),
    reviewedAt: now,
    reviewedBy: reviewedBy.trim(),
    extractionModel: current?.extractionModel || 'manual',
    promptVersion: current?.promptVersion || SCORING_PROMPT_VERSION,
    confidence: current?.confidence || 'low',
    status: result.maturityLevel === null ? 'insufficient_evidence' : hasOverride ? 'overridden' : 'scored',
    rationale: result.reason,
    overrideReason: overrideReason || null,
    evidenceIds: [...new Set(criteria.filter(finding => finding.status !== 'unknown' && finding.evidenceId).map(finding => finding.evidenceId!))],
    isMockRecommendation: false,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  upsertSubdivisionScore(score);
  invalidateApprovalsAfterStage(id, 5);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'criterion_review_completed',
    entityType: 'subdivision_score',
    entityId: score.id,
    oldValue: current ? { maturityLevel: current.maturityLevel, position: current.position, normalizedScore: current.normalizedScore, status: current.status } : null,
    newValue: { maturityLevel: score.maturityLevel, position: score.position, normalizedScore: score.normalizedScore, status: score.status, criteria, reviewedBy, policy: score.policy },
    reason: overrideReason || 'Score override',
    actor: 'user',
    timestamp: now,
  });

  return NextResponse.json(score);
}
