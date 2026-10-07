import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, getStageApprovals, deleteAssessment, invalidateApprovalsAfterStage, addAuditEntry } from '@/lib/db/store';
import { canAdvanceToStage } from '@/lib/workflow/stages';
import { isCriterionReviewMode, getCriterionReviewMode } from '@/lib/framework/criteria';
import { type AssessmentStage, type ScoringMethod } from '@/types/assessment';

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
  if ('scoringPolicy' in body) {
    return NextResponse.json({ error: 'Use the scoring-policy endpoint; a frozen policy cannot be overwritten' }, { status: 400 });
  }

  if ('scoringMethod' in body) {
    if (!isCriterionReviewMode(body.scoringMethod)) return NextResponse.json({ error: 'scoringMethod must be manual or llm_assisted' }, { status: 400 });
    const previousMethod: ScoringMethod = assessment.scoringMethod || getCriterionReviewMode(assessment.scoringPolicy);
    const updated = updateAssessment(id, { scoringMethod: body.scoringMethod });
    if (previousMethod !== body.scoringMethod) {
      invalidateApprovalsAfterStage(id, 5);
      addAuditEntry({ id: uuidv4(), assessmentId: id, action: 'scoring_method_changed', entityType: 'assessment', entityId: id,
        oldValue: { scoringMethod: previousMethod }, newValue: { scoringMethod: body.scoringMethod },
        reason: 'Stage 6 scoring method changed; scoring approval reopened', actor: 'user', timestamp: new Date().toISOString() });
    }
    return NextResponse.json(updated);
  }

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
