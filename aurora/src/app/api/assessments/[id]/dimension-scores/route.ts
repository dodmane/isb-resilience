import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getSubdivisionScores,
  getDimensionScores,
  upsertDimensionScore,
  addAuditEntry,
} from '@/lib/db/store';
import { calculateDimensionMaturity, normalize } from '@/lib/framework/scoring';
import { aggregateConfidence } from '@/lib/llm/scoring-recommendation';
import { type DimensionScore } from '@/types/scoring';
import { type MaturityLevel, type Confidence } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scores = getDimensionScores(id);
  return NextResponse.json(scores);
}

// Calculate dimension scores from subdivision averages
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const subScores = getSubdivisionScores(id);
  const deepDims = (assessment.dimensionSelections || []).filter(s => s.deepAssessment);
  const now = new Date().toISOString();
  const results: DimensionScore[] = [];

  for (const dimSel of deepDims) {
    const dimSubs = subScores.filter(s => s.dimensionKey === dimSel.dimensionKey);
    const subLevels = dimSubs.map(s => s.maturityLevel);
    const maturity = calculateDimensionMaturity(subLevels);
    const confidences = dimSubs
      .filter(s => s.maturityLevel !== null)
      .map(s => s.confidence);
    const confidence = aggregateConfidence(confidences);

    const score: DimensionScore = {
      id: uuidv4(),
      assessmentId: id,
      dimensionKey: dimSel.dimensionKey,
      maturityLevel: maturity,
      normalizedScore: maturity ? normalize(maturity) : null,
      confidence,
      status: maturity === null ? 'insufficient_evidence' : 'scored',
      overrideReason: null,
      subdivisionScoreIds: dimSubs.map(s => s.id),
      createdAt: now,
      updatedAt: now,
    };

    upsertDimensionScore(score);
    results.push(score);
  }

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'dimension_scores_calculated',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { calculatedCount: results.length },
    reason: 'Dimension scores calculated from subdivision averages',
    actor: 'system',
    timestamp: now,
  });

  return NextResponse.json(results);
}

// Override a dimension score
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { dimensionKey, maturityLevel, overrideReason, confidence } = body as {
    dimensionKey: string;
    maturityLevel: MaturityLevel | null;
    overrideReason: string;
    confidence?: Confidence;
  };

  if (!dimensionKey) {
    return NextResponse.json({ error: 'dimensionKey required' }, { status: 400 });
  }

  if (maturityLevel !== null && !overrideReason?.trim()) {
    return NextResponse.json({ error: 'Override reason required' }, { status: 400 });
  }

  const existing = getDimensionScores(id);
  const current = existing.find(s => s.dimensionKey === dimensionKey);

  const now = new Date().toISOString();
  const score: DimensionScore = {
    id: current?.id || uuidv4(),
    assessmentId: id,
    dimensionKey,
    maturityLevel,
    normalizedScore: maturityLevel ? normalize(maturityLevel) : null,
    confidence: confidence || current?.confidence || 'low',
    status: maturityLevel === null ? 'insufficient_evidence' : 'overridden',
    overrideReason: overrideReason || null,
    subdivisionScoreIds: current?.subdivisionScoreIds || [],
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  upsertDimensionScore(score);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'dimension_score_overridden',
    entityType: 'dimension_score',
    entityId: score.id,
    oldValue: current ? { maturityLevel: current.maturityLevel } : null,
    newValue: { maturityLevel, overrideReason },
    reason: overrideReason || 'Dimension score override',
    actor: 'user',
    timestamp: now,
  });

  return NextResponse.json(score);
}
