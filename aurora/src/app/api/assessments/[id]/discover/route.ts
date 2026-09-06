import { NextRequest, NextResponse } from 'next/server';
import { discoverCompany } from '@/lib/llm/discovery';
import {
  getAssessment,
  updateAssessment,
  createEvidence,
  addAuditEntry,
} from '@/lib/db/store';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const body = await request.json();
  const companyName = (body.companyName as string) || assessment.companyName;

  const result = await discoverCompany(companyName, id);

  updateAssessment(id, {
    companyName: result.profile.companyName,
    companyDescription: result.profile.companyDescription,
    industry: result.profile.industry,
    companySize: result.profile.companySize,
  });

  for (const ev of result.evidence) {
    createEvidence(ev);
  }

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'company_discovery',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { profile: result.profile, evidenceCount: result.evidence.length },
    reason: 'Company discovery completed via mock AI',
    actor: 'system',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    profile: result.profile,
    evidence: result.evidence,
  });
}
