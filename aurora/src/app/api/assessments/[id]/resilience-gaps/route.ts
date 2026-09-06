import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getDimensionScores,
  getScenarioAssessments,
  getEvidenceForAssessment,
  getResilienceGaps,
  setResilienceGaps,
  addAuditEntry,
} from '@/lib/db/store';
import { generateResilienceGaps } from '@/lib/framework/resilience';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gaps = getResilienceGaps(id);
  return NextResponse.json(gaps);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const dimScores = getDimensionScores(id);
  const scenarioAssessments = getScenarioAssessments(id);
  const evidence = getEvidenceForAssessment(id);

  const gaps = generateResilienceGaps(id, dimScores, scenarioAssessments, evidence);
  setResilienceGaps(id, gaps);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'resilience_gaps_generated',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { gapCount: gaps.length },
    reason: 'Resilience gaps identified from scoring and scenario analysis',
    actor: 'system',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(gaps);
}
