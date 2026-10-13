import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getSubdivisionScores,
  getDimensionScores,
  upsertDimensionScore,
  addAuditEntry,
  invalidateApprovalsAfterStage,
  getEvidenceForAssessment,
  getAuditTrail,
} from '@/lib/db/store';
import { summarizeDimension, summarizeAssessment, calculateEvidenceMatchedComparison } from '@/lib/framework/scoring';
import { aggregateConfidence } from '@/lib/llm/scoring-recommendation';
import { type DimensionScore } from '@/types/scoring';
import { getAssessmentSubdivisionMap, getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  if (request.nextUrl.searchParams.get('summary') === 'true') {
    const subdivisions = getSubdivisionScores(id);
    const subdivisionMap = getAssessmentSubdivisionMap(assessment.customSubdivisions, assessment.excludedSubdivisionKeys);
    const summary = summarizeAssessment(subdivisions, subdivisionMap);
    if (request.nextUrl.searchParams.get('export') === 'true') return NextResponse.json({ ...summary, policy: assessment.scoringPolicy || null,
      companyName: assessment.companyName, generatedAt: new Date().toISOString(), ratings: subdivisions, evidence: getEvidenceForAssessment(id), audit: getAuditTrail(id) });
    const comparisonId = request.nextUrl.searchParams.get('compareWith');
    if (comparisonId) {
      const other = getAssessment(comparisonId);
      if (!other) return NextResponse.json({ error: 'Comparison assessment not found' }, { status: 404 });
      const otherScores = getSubdivisionScores(comparisonId);
      const otherSubdivisionMap = getAssessmentSubdivisionMap(other.customSubdivisions, other.excludedSubdivisionKeys);
      const comparison = summarizeAssessment(otherScores, otherSubdivisionMap);
      return NextResponse.json({ ...summary, comparison, likeForLike: calculateEvidenceMatchedComparison(
        subdivisions, otherScores, assessment.scoringPolicy, other.scoringPolicy, subdivisionMap, otherSubdivisionMap,
      ) });
    }
    return NextResponse.json(summary);
  }
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
    const activeSubdivisions = getAssessmentSubdivisions(
      dimSel.dimensionKey as DimensionKey,
      assessment.customSubdivisions,
      assessment.excludedSubdivisionKeys,
    );
    const activeKeys = new Set(activeSubdivisions.map(subdivision => subdivision.key));
    const dimSubs = subScores.filter(s => s.dimensionKey === dimSel.dimensionKey && activeKeys.has(s.subdivisionKey));
    const result = summarizeDimension(dimSel.dimensionKey, subScores, activeSubdivisions);
    const confidences = dimSubs
      .filter(s => s.normalizedScore !== null)
      .map(s => s.confidence);
    const confidence = aggregateConfidence(confidences);

    const score: DimensionScore = {
      id: uuidv4(),
      assessmentId: id,
      dimensionKey: dimSel.dimensionKey,
      maturityLevel: result.maturityLevel,
      normalizedScore: result.normalizedScore,
      confidence,
      status: result.normalizedScore === null ? 'insufficient_evidence' : 'scored',
      overrideReason: null,
      subdivisionScoreIds: dimSubs.map(s => s.id),
      createdAt: now,
      updatedAt: now,
    };

    upsertDimensionScore(score);
    results.push(score);
  }

  invalidateApprovalsAfterStage(id, 6);
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

export async function PATCH() {
  return NextResponse.json({ error: 'Dimension scores are formula-only. Update subdivision ratings instead.' }, { status: 405 });
}
