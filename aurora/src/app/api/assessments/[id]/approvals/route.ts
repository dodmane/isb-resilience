import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getStageApprovals,
  upsertStageApproval,
  updateAssessment,
  addAuditEntry,
  invalidateApprovalsAfterStage,
  getSubdivisionScores,
} from '@/lib/db/store';
import { summarizeAssessment } from '@/lib/framework/scoring';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
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

  if (status === 'approved' && stage >= 6) {
    const scores = getSubdivisionScores(id);
    const selected = assessment.dimensionSelections.filter(selection => selection.deepAssessment);
    const expected = selected.flatMap(selection => (SUBDIVISIONS[selection.dimensionKey as DimensionKey] || []).map(sub => ({ dimension: selection.dimensionKey, sub: sub.key })));
    if (!expected.length || expected.some(item => !scores.some(score => score.dimensionKey === item.dimension && score.subdivisionKey === item.sub &&
      !!score.reviewedAt && !!score.reviewedBy && score.status !== 'stale' && score.status !== 'needs_review'))) {
      return NextResponse.json({ error: 'Review every selected sub-dimension with a Level/Position rating or explicitly leave it unscored.' }, { status: 409 });
    }
    if (stage >= 7) {
      const summary = summarizeAssessment(scores);
      if (summary.readiness.status !== 'review_ready') return NextResponse.json({ error: summary.readiness.blockers.join('; ') }, { status: 409 });
      if (getStageApprovals(id).find(approval => approval.stage === stage - 1)?.status !== 'approved') {
        return NextResponse.json({ error: 'The preceding stage requires a current approval' }, { status: 409 });
      }
    }
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
