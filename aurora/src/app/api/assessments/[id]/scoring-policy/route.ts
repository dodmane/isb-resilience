import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, addAuditEntry, invalidateApprovalsAfterStage } from '@/lib/db/store';
import { RUBRIC_VERSION, RUBRIC_STATUS, getCriteria, validPolicy, getCriterionReviewMode, isCriterionReviewMode, type CriterionReviewMode, type ScoringPolicy } from '@/lib/framework/criteria';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  const profile = assessment.scoringPolicy?.profile || 'standard';
  return NextResponse.json({ policy: assessment.scoringPolicy || null, version: RUBRIC_VERSION, status: RUBRIC_STATUS,
    catalog: Object.values(SUBDIVISIONS).flat().map(sub => ({ ...sub, criteria: getCriteria(sub.key, profile) })) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  if (assessment.scoringPolicy) return NextResponse.json({ error: 'Policy is frozen. Create a new assessment to use different criteria or dates.' }, { status: 409 });
  const body = await request.json();
  if (body.acknowledged !== true) return NextResponse.json({ error: 'Explicit approval of the provisional academic policy is required' }, { status: 400 });
  const policy: ScoringPolicy = { rubricVersion: RUBRIC_VERSION, profile: body.profile, periodStart: body.periodStart,
    reviewMode: (body.reviewMode || 'llm_assisted') as CriterionReviewMode,
    periodEnd: body.periodEnd, approvedAt: new Date().toISOString(), approvalReason: body.approvalReason };
  if (!validPolicy(policy) || policy.periodEnd > policy.approvedAt.slice(0, 10)) return NextResponse.json({ error: 'Choose a valid profile, past reporting window and written benchmark approval reason' }, { status: 400 });
  updateAssessment(id, { scoringPolicy: policy });
  invalidateApprovalsAfterStage(id, 5);
  addAuditEntry({ id: uuidv4(), assessmentId: id, action: 'scoring_policy_frozen', entityType: 'assessment', entityId: id,
    oldValue: null, newValue: policy, reason: policy.approvalReason, actor: 'user', timestamp: policy.approvedAt });
  return NextResponse.json(policy);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  if (!validPolicy(assessment.scoringPolicy)) return NextResponse.json({ error: 'Freeze the SaaS Criterion Policy before choosing a review method' }, { status: 409 });

  const body = await request.json();
  if (!isCriterionReviewMode(body.reviewMode)) return NextResponse.json({ error: 'reviewMode must be manual or llm_assisted' }, { status: 400 });
  const previousMode = getCriterionReviewMode(assessment.scoringPolicy);
  if (previousMode === body.reviewMode) return NextResponse.json(assessment.scoringPolicy);

  const now = new Date().toISOString();
  const updatedPolicy: ScoringPolicy = { ...assessment.scoringPolicy, reviewMode: body.reviewMode };
  updateAssessment(id, { scoringPolicy: updatedPolicy });
  invalidateApprovalsAfterStage(id, 5);
  addAuditEntry({ id: uuidv4(), assessmentId: id, action: 'criterion_review_mode_changed', entityType: 'assessment', entityId: id,
    oldValue: { reviewMode: previousMode }, newValue: { reviewMode: body.reviewMode },
    reason: 'Criterion review method changed; Stage 6 approval reopened', actor: 'user', timestamp: now });
  return NextResponse.json(updatedPolicy);
}