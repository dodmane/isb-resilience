import { NextRequest, NextResponse } from 'next/server';
import { getAssessment, updateAssessment, getStageApprovals, deleteAssessment } from '@/lib/db/store';
import { canAdvanceToStage } from '@/lib/workflow/stages';
import { type AssessmentStage } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }
  const approvals = getStageApprovals(id);
  return NextResponse.json({ assessment, approvals });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const body = await request.json();

  if (body.currentStage !== undefined) {
    const targetStage = body.currentStage as AssessmentStage;
    const approvals = getStageApprovals(id);
    if (!canAdvanceToStage(targetStage, approvals)) {
      return NextResponse.json(
        { error: `Cannot advance to stage ${targetStage}. Previous stage not approved.` },
        { status: 403 }
      );
    }
  }

  const updated = updateAssessment(id, body);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteAssessment(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
