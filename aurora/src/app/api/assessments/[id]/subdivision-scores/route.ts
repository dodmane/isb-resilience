import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getEvidenceForAssessment,
  getSubdivisionScores,
  upsertSubdivisionScore,
  addAuditEntry,
} from '@/lib/db/store';
import { recommendSubdivisionScoreAsync } from '@/lib/llm/scoring-recommendation';
import { isLLMConfigured } from '@/lib/llm/client';
import { normalize } from '@/lib/framework/scoring';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type SubdivisionScore } from '@/types/scoring';
import { type MaturityLevel, type Confidence } from '@/types/assessment';

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

  const evidence = getEvidenceForAssessment(id);
  const existing = getSubdivisionScores(id);
  const deepDims = (assessment.dimensionSelections || []).filter(s => s.deepAssessment);
  const now = new Date().toISOString();
  const newScores: SubdivisionScore[] = [];

  for (const dimSel of deepDims) {
    const subs = SUBDIVISIONS[dimSel.dimensionKey as DimensionKey] || [];
    for (const sub of subs) {
      const alreadyScored = existing.find(
        s => s.dimensionKey === dimSel.dimensionKey && s.subdivisionKey === sub.key && s.status === 'overridden'
      );
      if (alreadyScored) continue;

      const subEvidence = evidence.filter(
        e => e.dimensionKey === dimSel.dimensionKey && e.subdivisionKey === sub.key
      );

      const recommendation = await recommendSubdivisionScoreAsync(dimSel.dimensionKey, sub.key, subEvidence);

      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId: id,
        dimensionKey: dimSel.dimensionKey,
        subdivisionKey: sub.key,
        maturityLevel: recommendation.maturityLevel,
        normalizedScore: recommendation.maturityLevel ? normalize(recommendation.maturityLevel) : null,
        confidence: recommendation.confidence,
        status: recommendation.status,
        rationale: recommendation.rationale,
        overrideReason: null,
        evidenceIds: subEvidence.filter(e => e.status === 'accepted').map(e => e.id),
        isMockRecommendation: !isLLMConfigured(),
        createdAt: now,
        updatedAt: now,
      };

      upsertSubdivisionScore(score);
      newScores.push(score);
    }
  }

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'subdivision_scoring_generated',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { generatedCount: newScores.length },
    reason: 'Subdivision scoring recommendations generated via mock AI',
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
  const { dimensionKey, subdivisionKey, maturityLevel, overrideReason, confidence } = body as {
    dimensionKey: string;
    subdivisionKey: string;
    maturityLevel: MaturityLevel | null;
    overrideReason: string;
    confidence?: Confidence;
  };

  if (!dimensionKey || !subdivisionKey) {
    return NextResponse.json({ error: 'dimensionKey and subdivisionKey required' }, { status: 400 });
  }

  if (maturityLevel !== null && !overrideReason?.trim()) {
    return NextResponse.json({ error: 'Override reason required when changing score' }, { status: 400 });
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
    maturityLevel,
    normalizedScore: maturityLevel ? normalize(maturityLevel) : null,
    confidence: confidence || current?.confidence || 'low',
    status: maturityLevel === null ? 'insufficient_evidence' : 'overridden',
    rationale: current?.rationale || '',
    overrideReason: overrideReason || null,
    evidenceIds: current?.evidenceIds || [],
    isMockRecommendation: false,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  upsertSubdivisionScore(score);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'subdivision_score_overridden',
    entityType: 'subdivision_score',
    entityId: score.id,
    oldValue: current ? { maturityLevel: current.maturityLevel, status: current.status } : null,
    newValue: { maturityLevel, status: score.status, overrideReason },
    reason: overrideReason || 'Score override',
    actor: 'user',
    timestamp: now,
  });

  return NextResponse.json(score);
}
