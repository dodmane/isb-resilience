import { type AssessmentStage, type ApprovalStatus } from '@/types/assessment';

export const TOTAL_STAGES = 10;

export function canAdvanceToStage(
  targetStage: AssessmentStage,
  approvals: { stage: AssessmentStage; status: ApprovalStatus }[]
): boolean {
  if (targetStage === 1) return true;
  const previousStage = (targetStage - 1) as AssessmentStage;
  const approval = approvals.find((a) => a.stage === previousStage);
  return approval?.status === 'approved';
}

export function isStageAccessible(
  stage: AssessmentStage,
  currentStage: AssessmentStage,
  approvals: { stage: AssessmentStage; status: ApprovalStatus }[]
): boolean {
  if (stage <= currentStage) return true;
  if (stage === currentStage + 1) {
    return canAdvanceToStage(stage as AssessmentStage, approvals);
  }
  return false;
}

export function getNextStage(current: AssessmentStage): AssessmentStage | null {
  if (current >= TOTAL_STAGES) return null;
  return (current + 1) as AssessmentStage;
}
