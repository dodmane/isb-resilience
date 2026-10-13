import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getEvidenceForAssessment,
  createEvidence,
  addAuditEntry,
} from '@/lib/db/repository';
import { researchEvidence } from '@/lib/llm/research';
import { getAssessmentSubdivisionMap } from '@/lib/framework/subdivisions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = (await getAssessment(id));
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  if (!assessment.evidencePlan?.length) {
    return NextResponse.json({ error: 'No evidence plan configured' }, { status: 400 });
  }

  const existing = (await getEvidenceForAssessment(id));

  const result = await researchEvidence(
    id,
    assessment.companyName,
    assessment.evidencePlan,
    existing,
    getAssessmentSubdivisionMap(assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
  );

  for (const ev of result.evidence) {
    (await createEvidence(ev));
  }

  (await addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'evidence_research_executed',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { newEvidenceCount: result.evidence.length, summary: result.searchSummary },
    reason: 'Evidence research completed via mock AI',
    actor: 'system',
    timestamp: new Date().toISOString(),
  }));

  return NextResponse.json({
    newEvidence: result.evidence,
    summary: result.searchSummary,
  });
}
