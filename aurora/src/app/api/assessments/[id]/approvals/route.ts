import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getStageApprovals,
  upsertStageApproval,
  updateAssessment,
  addAuditEntry,
  invalidateApprovalsAfterStage,
} from '@/lib/db/store';
import { getNextStage } from '@/lib/workflow/stages';
import { type AssessmentStage, type ApprovalStatus, type StageApproval } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const approvals = getStageApprovals(id);
  return NextResponse.json(approvals);
}

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
  const { stage, status, notes } = body as {
    stage: AssessmentStage;
    status: ApprovalStatus;
    notes?: string;
  };

  if (!stage || !status) {
    return NextResponse.json({ error: 'stage and status are required' }, { status: 400 });
  }

  if (stage > assessment.currentStage) {
    return NextResponse.json(
      { error: 'Cannot approve a stage that has not been reached' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const approval: StageApproval = {
    id: uuidv4(),
    assessmentId: id,
    stage,
    status,
    approvedAt: status === 'approved' ? now : null,
    notes: notes || '',
  };

  upsertStageApproval(approval);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: `stage_${status}`,
    entityType: 'stage',
    entityId: String(stage),
    oldValue: null,
    newValue: { stage, status, notes },
    reason: notes || `Stage ${stage} ${status}`,
    actor: 'user',
    timestamp: now,
  });

  if (status === 'approved') {
    const nextStage = getNextStage(stage);
    if (nextStage && nextStage > assessment.currentStage) {
      updateAssessment(id, { currentStage: nextStage });
    }
  }

  if (status === 'rejected') {
    invalidateApprovalsAfterStage(id, stage);
  }

  const approvals = getStageApprovals(id);
  return NextResponse.json(approvals);
}
