import { canAdvanceToStage, isStageAccessible, getNextStage } from '@/lib/workflow/stages';
import { type AssessmentStage, type ApprovalStatus } from '@/types/assessment';

describe('Workflow Stage Machine', () => {
  describe('canAdvanceToStage', () => {
    it('should allow advancing to stage 1 without any approvals', () => {
      expect(canAdvanceToStage(1, [])).toBe(true);
    });

    it('should NOT allow advancing to stage 2 without stage 1 approval', () => {
      expect(canAdvanceToStage(2, [])).toBe(false);
    });

    it('should NOT allow advancing to stage 2 when stage 1 is pending', () => {
      const approvals = [{ stage: 1 as AssessmentStage, status: 'pending' as ApprovalStatus }];
      expect(canAdvanceToStage(2, approvals)).toBe(false);
    });

    it('should NOT allow advancing to stage 2 when stage 1 is rejected', () => {
      const approvals = [{ stage: 1 as AssessmentStage, status: 'rejected' as ApprovalStatus }];
      expect(canAdvanceToStage(2, approvals)).toBe(false);
    });

    it('should allow advancing to stage 2 when stage 1 is approved', () => {
      const approvals = [{ stage: 1 as AssessmentStage, status: 'approved' as ApprovalStatus }];
      expect(canAdvanceToStage(2, approvals)).toBe(true);
    });

    it('should enforce sequential approval — cannot skip stages', () => {
      const approvals = [{ stage: 1 as AssessmentStage, status: 'approved' as ApprovalStatus }];
      expect(canAdvanceToStage(3, approvals)).toBe(false);
    });

    it('should allow advancing through multiple approved stages', () => {
      const approvals = [
        { stage: 1 as AssessmentStage, status: 'approved' as ApprovalStatus },
        { stage: 2 as AssessmentStage, status: 'approved' as ApprovalStatus },
        { stage: 3 as AssessmentStage, status: 'approved' as ApprovalStatus },
      ];
      expect(canAdvanceToStage(4, approvals)).toBe(true);
    });
  });

  describe('isStageAccessible', () => {
    it('should allow access to current and earlier stages', () => {
      expect(isStageAccessible(1, 3 as AssessmentStage, [])).toBe(true);
      expect(isStageAccessible(2, 3 as AssessmentStage, [])).toBe(true);
      expect(isStageAccessible(3, 3 as AssessmentStage, [])).toBe(true);
    });

    it('should NOT allow access to future stages without approval', () => {
      expect(isStageAccessible(4, 3 as AssessmentStage, [])).toBe(false);
    });
  });

  describe('getNextStage', () => {
    it('should return the next stage', () => {
      expect(getNextStage(1)).toBe(2);
      expect(getNextStage(5)).toBe(6);
    });

    it('should return null at the final stage', () => {
      expect(getNextStage(10)).toBe(null);
    });
  });
});
