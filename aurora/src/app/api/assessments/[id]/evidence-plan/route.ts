import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, addAuditEntry } from '@/lib/db/store';
import { type EvidencePlanItem } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }
  return NextResponse.json(assessment.evidencePlan || []);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const body = await request.json();
  const plan = body.plan as EvidencePlanItem[];

  if (!Array.isArray(plan)) {
    return NextResponse.json({ error: 'plan array required' }, { status: 400 });
  }

  updateAssessment(id, { evidencePlan: plan });

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'evidence_plan_updated',
    entityType: 'assessment',
    entityId: id,
    oldValue: { plan: assessment.evidencePlan },
    newValue: { plan },
    reason: 'Evidence plan updated',
    actor: 'user',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(plan);
}
