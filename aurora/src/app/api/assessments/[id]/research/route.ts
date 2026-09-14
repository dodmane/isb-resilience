import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getEvidenceForAssessment,
  createEvidence,
  addAuditEntry,
} from '@/lib/db/store';
import { researchEvidence } from '@/lib/llm/research';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assessment = getAssessment(id);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!assessment.evidencePlan?.length) {
      return NextResponse.json({ error: 'No evidence plan configured' }, { status: 400 });
    }

    const existing = getEvidenceForAssessment(id);

    const result = await researchEvidence(
      id,
      assessment.companyName,
      assessment.evidencePlan,
      existing,
      Boolean(assessment.useMockData)
    );

    for (const ev of result.evidence) {
      createEvidence(ev);
    }

    addAuditEntry({
      id: uuidv4(),
      assessmentId: id,
      action: 'evidence_research_executed',
      entityType: 'assessment',
      entityId: id,
      oldValue: null,
      newValue: { newEvidenceCount: result.evidence.length, summary: result.searchSummary },
      reason: assessment.useMockData ? 'Evidence research completed via Mock Data' : 'Evidence research completed via LLM',
      actor: 'system',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      newEvidence: result.evidence,
      summary: result.searchSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Evidence research failed' }, { status: 500 });
  }
}
